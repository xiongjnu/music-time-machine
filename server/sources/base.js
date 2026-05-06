/**
 * 音源适配器基类 — 定义统一接口，具体平台适配器继承实现
 */

class SourceAdapter {
  constructor(name) {
    this.name = name;
  }

  async search(keyword) {
    throw new Error(`${this.name}: search() not implemented`);
  }

  async getSongDetail(id) {
    throw new Error(`${this.name}: getSongDetail() not implemented`);
  }

  async getPlayUrl(id) {
    throw new Error(`${this.name}: getPlayUrl() not implemented`);
  }
}

module.exports = { SourceAdapter };
