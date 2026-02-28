import { App, ButtonComponent, Modal, Notice, Setting } from 'obsidian';
import UpdateTimeOnSavePlugin from './main';

const createTextSpan = (text: string): HTMLSpanElement => {
  const textSpan = document.createElement('span');
  textSpan.setText(text);
  return textSpan;
};

const createBr = () => document.createElement('br');

export class UpdateAllModal extends Modal {
  plugin: UpdateTimeOnSavePlugin;

  divContainer?: HTMLDivElement;
  runButton?: ButtonComponent;
  cancelButton?: ButtonComponent;
  settingsSection?: Setting;
  isOpened = false;

  constructor(app: App, plugin: UpdateTimeOnSavePlugin) {
    super(app);
    this.plugin = plugin;
  }

  async onRun() {
    if (!this.divContainer) {
      this.close();
      return;
    }
    const allMdFiles = await this.plugin.getAllFilesPossiblyAffected();
    const progress = document.createElement('progress');
    progress.setAttr('max', allMdFiles.length);

    const fileCounter = document.createElement('span');

    const updateCount = (count: number) => {
      progress.setAttr('value', count);
      fileCounter.setText(`${count}/${allMdFiles.length}`);
    };
    updateCount(0);

    const wrapperBar = document.createElement('div');
    wrapperBar.append(progress, fileCounter);
    wrapperBar.addClass('progress-section');

    const header = createTextSpan('正在更新文件...');

    this.divContainer.replaceChildren(header, wrapperBar);

    if (this.settingsSection) {
      this.contentEl.removeChild(this.settingsSection.settingEl);
    }
    for (let i = 0; i < allMdFiles.length; i++) {
      if (!this.isOpened) {
        new Notice('批量更新已停止。', 2000);
        return;
      }
      updateCount(i + 1);
      await this.plugin.handleFileChange(allMdFiles[i], 'bulk');
    }

    const doneMessage = createTextSpan(
      '完成！您可以安全关闭此对话框。',
    );
    const el = new Setting(this.containerEl).addButton((btn) => {
      btn.setButtonText('关闭').onClick(() => {
        this.close();
      });
    }).settingEl;
    this.divContainer.replaceChildren(doneMessage, createBr(), createBr(), el);
  }

  async onOpen() {
    this.isOpened = true;
    let { contentEl } = this;
    contentEl.addClass('update-time-on-edit--bulk-modal');
    const header = contentEl.createEl('h2', {
      text: `正在查找仓库中符合条件的文件...`,
    });

    const allMdFiles = await this.plugin.getAllFilesPossiblyAffected();

    header.setText(`更新仓库中的所有 ${allMdFiles.length} 个文件`);

    const div = contentEl.createDiv();
    this.divContainer = div;

    div.append(
      div.createSpan({
        text:
          '这将更新受此插件影响的所有文件的创建时间和更新时间',
      }),
      createBr(),
      createBr(),
      div.createSpan({
        text: `警告：此操作将影响您仓库中的 ${allMdFiles.length} 个文件。请确保您已正确调整设置，并做好备份。`,
        cls: 'update-time-on-edit--settings--warn',
      }),
      createBr(),
      createBr(),
    );

    this.settingsSection = new Setting(contentEl)
      .addButton((btn) => {
        btn
          .setButtonText('执行')
          .setCta()
          .onClick(() => {
            this.onRun();
          });
        this.runButton = btn;
      })
      .addButton((btn) => {
        this.cancelButton = btn;
        btn.setButtonText('取消').onClick(() => {
          this.close();
        });
      });
  }
  onClose() {
    let { contentEl } = this;
    contentEl.empty();
    this.isOpened = false;
  }
}
