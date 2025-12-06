declare module "exif-parser" {
  interface ExifTags {
    DateTimeOriginal?: number;
    CreateDate?: number;
    ModifyDate?: number;
    GPSLatitude?: number;
    GPSLongitude?: number;
    GPSLatitudeRef?: string;
    GPSLongitudeRef?: string;
    Make?: string;
    Model?: string;
    ImageWidth?: number;
    ImageHeight?: number;
    Orientation?: number;
    [key: string]: unknown;
  }

  interface ExifResult {
    tags: ExifTags;
    imageSize?: {
      width: number;
      height: number;
    };
    thumbnailOffset?: number;
    thumbnailLength?: number;
    thumbnailType?: number;
    app1Offset?: number;
  }

  interface ExifParserInstance {
    parse(): ExifResult;
    enableBinaryFields(enable: boolean): ExifParserInstance;
    enablePointers(enable: boolean): ExifParserInstance;
    enableSimpleValues(enable: boolean): ExifParserInstance;
    enableReturnTags(enable: boolean): ExifParserInstance;
    enableTagNames(enable: boolean): ExifParserInstance;
    enableImageSize(enable: boolean): ExifParserInstance;
  }

  function create(buffer: Buffer): ExifParserInstance;

  export = { create };
}
