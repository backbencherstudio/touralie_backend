import { IStorage } from './drivers/iStorage';
export class StorageClass {
  protected adapter: IStorage;

  constructor(adapter: IStorage) {
    this.adapter = adapter;
  }

  /**
   * check if file exists
   * @param key
   * @returns
   */
  public async isExists(key: string): Promise<boolean> {
    return await this.adapter.isExists(key);
  }

  /**
   * get data url
   * @param key
   * @returns
   */
  public url(key: string) {
    return this.adapter.url(key);
  }

  /**
   * read data
   * @param key
   * @returns
   */
  public async get(key: string) {
    return await this.adapter.get(key);
  }

  /**
   * store data
   * @param key
   * @param value
   * @returns
   */
  public async put(key: string, value: any, contentType?: string) {
    return await this.adapter.put(key, value, contentType);
  }

  /**
   * delete data
   * @param key
   * @returns
   */
  public async delete(key: string) {
    return await this.adapter.delete(key);
  }

  /**
   * get signed url
   * @param key
   * @param expires
   * @returns
   */
  public async getSignedUrl(
    key: string,
    expires?: number,
    contentType?: string,
  ) {
    return await this.adapter.getSignedUrl(key, expires, contentType);
  }

  /**
   * move file
   * @param from
   * @param to
   * @returns
   */
  public async move(from: string, to: string) {
    return await this.adapter.move(from, to);
  }
}
