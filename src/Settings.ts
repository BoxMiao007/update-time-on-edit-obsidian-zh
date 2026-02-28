import { App, PluginSettingTab, SearchComponent, Setting } from 'obsidian';
import UpdateTimeOnSavePlugin from './main';
import { FolderSuggest } from './suggesters/FolderSuggester';
import { FileSuggest } from './suggesters/FileSuggester';
import { onlyUniqueArray } from './utils';
import { format } from 'date-fns';
import { UpdateAllModal } from './UpdateAllModal';
import { UpdateAllCacheData } from './UpdateAllCacheData';

export interface UpdateTimeOnEditSettings {
  dateFormat: string;
  enableNumberProperties: boolean;
  enableCreateTime: boolean;
  headerUpdated: string;
  headerCreated: string;
  minMinutesBetweenSaves: number;
  // Union because of legacy
  ignoreGlobalFolder?: string | string[];
  ignoreCreatedFolder?: string[];
  ignoreFiles?: string[];

  enableExperimentalHash?: boolean;
  fileHashMap: Record<string, string>;
}

export const DEFAULT_SETTINGS: UpdateTimeOnEditSettings = {
  dateFormat: "yyyy-MM-dd'T'HH:mm",
  enableNumberProperties: false,
  enableCreateTime: true,
  headerUpdated: 'updated',
  headerCreated: 'created',
  minMinutesBetweenSaves: 1,
  ignoreGlobalFolder: [],
  ignoreCreatedFolder: [],
  ignoreFiles: [],
  enableExperimentalHash: false,
  fileHashMap: {},
};

export class UpdateTimeOnEditSettingsTab extends PluginSettingTab {
  plugin: UpdateTimeOnSavePlugin;

  constructor(app: App, plugin: UpdateTimeOnSavePlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    let { containerEl } = this;

    containerEl.empty();

    containerEl.createEl('h2', { text: '全局设置' });

    this.addExcludedFoldersSetting();
    this.addExcludedFilesSetting();
    this.addTimeBetweenUpdates();
    this.addDateFormat();
    this.addEnableNumberProperties();

    new Setting(this.containerEl)
      .setName('更新所有文件')
      .setDesc(
        '此插件仅对新文件生效，如果您想一次性更新仓库中的所有文件，可以在此操作。',
      )
      .addButton((cb) => {
        cb.setButtonText('更新所有文件').onClick(() => {
          new UpdateAllModal(this.app, this.plugin).open();
        });
      });

    containerEl.createEl('h2', { text: '更新时间' });

    this.addFrontMatterUpdated();

    containerEl.createEl('h2', { text: '创建时间' });

    this.addEnableCreated();
    this.addFrontMatterCreated();
    this.addExcludedCreatedFoldersSetting();

    containerEl.createEl('h2', { text: '实验性设置' });

    new Setting(this.containerEl)
      .setName('启用哈希匹配')
      .setDesc(
        '使用哈希系统防止过多更新发生，特别是在同步场景下。',
      )
      .addToggle((cb) =>
        cb
          .setValue(this.plugin.settings.enableExperimentalHash ?? false)
          .onChange(async (newValue) => {
            this.plugin.settings.enableExperimentalHash = newValue;
            await this.saveSettings();
          }),
      )
      .addButton((cb) =>
        cb.setButtonText('填充初始缓存').onClick(() => {
          new UpdateAllCacheData(this.app, this.plugin).open();
        }),
      );
  }

  async saveSettings() {
    await this.plugin.saveSettings();
  }

  addDateFormat(): void {
    this.createDateFormatEditor({
      getValue: () => this.plugin.settings.dateFormat,
      name: '日期格式',
      description: '用于读取和写入的日期格式',
      setValue: (newValue) => (this.plugin.settings.dateFormat = newValue),
    });
  }

  createDateFormatEditor({
    description,
    name,
    getValue,
    setValue,
  }: DateFormatArgs) {
    const createDoc = () => {
      const descr = document.createDocumentFragment();
      descr.append(
        description,
        descr.createEl('br'),
        '参考 ',
        descr.createEl('a', {
          href: 'https://date-fns.org/v2.25.0/docs/format',
          text: 'date-fns 文档',
        }),
        descr.createEl('br'),
        `当前显示: ${format(new Date(), getValue())}`,
        descr.createEl('br'),
        `Obsidian 日期属性默认格式: yyyy-MM-dd'T'HH:mm`,
      );
      return descr;
    };
    let dformat = new Setting(this.containerEl)
      .setName(name)
      .setDesc(createDoc())
      .addText((text) =>
        text
          .setPlaceholder(DEFAULT_SETTINGS.dateFormat)
          .setValue(getValue())
          .onChange(async (value) => {
            setValue(value);
            dformat.setDesc(createDoc());
            await this.saveSettings();
          }),
      );
  }

  addEnableNumberProperties(): void {
    new Setting(this.containerEl)
      .setName('启用数字属性类型')
      .setDesc(
        '当使用数字格式（如 Unix 时间戳）时，将数字分配给日期属性（而非字符串）。',
      )
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.enableNumberProperties)
          .onChange(async (newValue) => {
            this.plugin.settings.enableNumberProperties = newValue;
            await this.saveSettings();
          }),
      );
  }

  addTimeBetweenUpdates(): void {
    new Setting(this.containerEl)
      .setName('更新间隔最小分钟数')
      .setDesc('如果文件更新过于频繁，请增加此值。')
      .addSlider((slider) =>
        slider
          .setLimits(1, 30, 1)
          .setValue(this.plugin.settings.minMinutesBetweenSaves)
          .onChange(async (value) => {
            this.plugin.settings.minMinutesBetweenSaves = value;
            await this.saveSettings();
          })
          .setDynamicTooltip(),
      );
  }

  addEnableCreated(): void {
    new Setting(this.containerEl)
      .setName('启用创建时间属性更新')
      .setDesc('如果不存在，将设置为当前时间')
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.enableCreateTime)
          .onChange(async (newValue) => {
            this.plugin.settings.enableCreateTime = newValue;
            await this.saveSettings();
            this.display();
          }),
      );
  }

  addFrontMatterUpdated(): void {
    new Setting(this.containerEl)
      .setName('更新时间属性名')
      .setDesc('front matter 中用于存储更新时间的键名。')
      .addText((text) =>
        text
          .setPlaceholder('updated')
          .setValue(this.plugin.settings.headerUpdated ?? '')
          .onChange(async (value) => {
            this.plugin.settings.headerUpdated = value;
            await this.saveSettings();
          }),
      );
  }

  addFrontMatterCreated(): void {
    if (!this.plugin.settings.enableCreateTime) {
      return;
    }
    new Setting(this.containerEl)
      .setName('创建时间属性名')
      .setDesc('front matter 中用于存储创建时间的键名')
      .addText((text) =>
        text
          .setPlaceholder('created')
          .setValue(this.plugin.settings.headerCreated ?? '')
          .onChange(async (value) => {
            this.plugin.settings.headerCreated = value;
            await this.saveSettings();
          }),
      );
  }

  addExcludedCreatedFoldersSetting(): void {
    if (!this.plugin.settings.enableCreateTime) {
      return;
    }

    this.doSearchAndRemoveList({
      currentList: this.plugin.settings.ignoreCreatedFolder ?? [],
      setValue: async (newValue) => {
        this.plugin.settings.ignoreCreatedFolder = newValue;
      },
      name: '排除创建时间更新的文件夹',
      description:
        '这些文件夹中的文件不会触发创建时间更新。',
    });
  }

  addExcludedFoldersSetting(): void {
    this.doSearchAndRemoveList({
      currentList: this.plugin.getIgnoreFolders(),
      setValue: async (newValue) => {
        this.plugin.settings.ignoreGlobalFolder = newValue;
      },
      name: '排除所有更新的文件夹',
      description:
        '这些文件夹中的文件不会触发任何更新时间或创建时间更新。',
    });
  }

  addExcludedFilesSetting(): void {
    this.doSearchAndRemoveFileList({
      currentList: this.plugin.settings.ignoreFiles ?? [],
      setValue: async (newValue) => {
        this.plugin.settings.ignoreFiles = newValue;
      },
      name: '排除所有更新的笔记文件',
      description:
        '这些笔记文件不会触发任何更新时间或创建时间更新。',
    });
  }

  doSearchAndRemoveList({
    currentList,
    setValue,
    description,
    name,
  }: ArgsSearchAndRemove) {
    let searchInput: SearchComponent | undefined;
    new Setting(this.containerEl)
      .setName(name)
      .setDesc(description)
      .addSearch((cb) => {
        searchInput = cb;
        new FolderSuggest(this.app, cb.inputEl);
        cb.setPlaceholder('示例: 文件夹1/文件夹2');
        // @ts-ignore
        cb.containerEl.addClass('time_search');
      })
      .addButton((cb) => {
        cb.setIcon('plus');
        cb.setTooltip('添加文件夹');
        cb.onClick(async () => {
          if (!searchInput) {
            return;
          }
          const newFolder = searchInput.getValue();

          await setValue([...currentList, newFolder].filter(onlyUniqueArray));
          await this.saveSettings();
          searchInput.setValue('');
          this.display();
        });
      });

    currentList.forEach((ignoreFolder) =>
      new Setting(this.containerEl).setName(ignoreFolder).addButton((button) =>
        button.setButtonText('移除').onClick(async () => {
          await setValue(currentList.filter((value) => value !== ignoreFolder));
          await this.saveSettings();
          this.display();
        }),
      ),
    );
  }

  doSearchAndRemoveFileList({
    currentList,
    setValue,
    description,
    name,
  }: ArgsSearchAndRemoveFiles) {
    let searchInput: SearchComponent | undefined;
    new Setting(this.containerEl)
      .setName(name)
      .setDesc(description)
      .addSearch((cb) => {
        searchInput = cb;
        new FileSuggest(this.app, cb.inputEl);
        cb.setPlaceholder('示例: 笔记/文件名.md');
        // @ts-ignore
        cb.containerEl.addClass('time_search');
      })
      .addButton((cb) => {
        cb.setIcon('plus');
        cb.setTooltip('添加文件');
        cb.onClick(async () => {
          if (!searchInput) {
            return;
          }
          const newFile = searchInput.getValue();

          await setValue([...currentList, newFile].filter(onlyUniqueArray));
          await this.saveSettings();
          searchInput.setValue('');
          this.display();
        });
      });

    currentList.forEach((ignoreFile) =>
      new Setting(this.containerEl).setName(ignoreFile).addButton((button) =>
        button.setButtonText('移除').onClick(async () => {
          await setValue(currentList.filter((value) => value !== ignoreFile));
          await this.saveSettings();
          this.display();
        }),
      ),
    );
  }
}

type DateFormatArgs = {
  getValue: () => string;
  setValue: (newValue: string) => void;
  name: string;
  description: string;
};

type ArgsSearchAndRemove = {
  name: string;
  description: string;
  currentList: string[];
  setValue: (newValue: string[]) => Promise<void>;
};

type ArgsSearchAndRemoveFiles = {
  name: string;
  description: string;
  currentList: string[];
  setValue: (newValue: string[]) => Promise<void>;
};
