// 学习者拖进输入框的文件（交给项目分流到资料或学过的，W9）。

export interface PickedFile {
  file: File;
  /** 相对路径（文件夹里的带文件夹名）。 */
  path: string;
}
