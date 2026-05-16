declare module 'ali-oss' {
  interface OSSOptions {
    region: string
    accessKeyId: string
    accessKeySecret: string
    stsToken?: string
    bucket: string
    secure?: boolean
  }

  interface PutObjectResult {
    name: string
    url: string
    res: {
      status: number
      headers: Record<string, string>
    }
  }

  interface SignatureUrlOptions {
    method?: string
    expires?: number
    'Content-Type'?: string
  }

  interface ListObjectsResult {
    objects: Array<{
      name: string
      url: string
      lastModified: string
      size: number
    }>
    prefixes?: string[]
    isTruncated: boolean
    nextMarker?: string
  }

  interface CopyObjectResult {
    name: string
    url: string
  }

  interface STSCredentials {
    AccessKeyId: string
    AccessKeySecret: string
    SecurityToken: string
    Expiration: string
  }

  interface AssumeRoleResult {
    credentials: STSCredentials
  }

  interface STSOptions {
    accessKeyId: string
    accessKeySecret: string
  }

  class OSS {
    constructor(options: OSSOptions)
    put(name: string, data: Blob | File, options?: object): Promise<PutObjectResult>
    signatureUrl(name: string, options?: SignatureUrlOptions): string
    delete(name: string): Promise<void>
    deleteMulti(names: string[]): Promise<void>
    copy(name: string, source: string, options?: object): Promise<CopyObjectResult>
    list(query: object, options?: object): Promise<ListObjectsResult>
  }

  namespace OSS {
    class STS {
      constructor(options: STSOptions)
      assumeRole(
        roleArn: string,
        policy?: object,
        durationSeconds?: number,
        sessionName?: string
      ): Promise<AssumeRoleResult>
    }
  }

  export default OSS
}
