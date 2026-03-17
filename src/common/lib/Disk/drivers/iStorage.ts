/**
 * IAdapter interface
 */
export interface IStorage {
  /**
   * check if file exists
   * @param key
   */
  isExists(key: string): Promise<boolean>;

  /**
   * read data
   * @param key
   */
  get(key: string): Promise<any>;

  /**
   * get file url
   * @param key
   */
  url(key: string): string;

  /**
   * put data
   * @param key
   * @param value
   */
  put(key: string, value: any): Promise<any>;

  /**
   * delete data
   * @param key
   */
  delete(key: string): Promise<any>;
  /**
   * get signed url for uploading/downloading
   * @param key
   * @param expires seconds
   */
  getSignedUrl(
    key: string,
    expires?: number,
    contentType?: string,
  ): Promise<string>;
  /**
   * move file
   * @param from
   * @param to
   */
  move(from: string, to: string): Promise<any>;
}
