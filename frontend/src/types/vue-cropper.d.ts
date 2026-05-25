declare module 'vue-cropper/next' {
  import type { DefineComponent } from 'vue'

  interface VueCropperMethods {
    getCropData: (callback: (data: string) => void) => void
    getCropBlob: (callback: (data: Blob) => void) => void
    getRealCropData: (callback: (data: string) => void) => void
    clearCrop: () => void
    refresh: () => void
    relcrop: () => void
    rotateLeft: () => void
    rotateRight: () => void
    startCrop: () => void
    stopCrop: () => void
    scaleSize: (scale: number) => void
    changeScale: (num: number) => void
  }

  const VueCropper: DefineComponent<Record<string, unknown>, Record<string, unknown>, VueCropperMethods>
  export { VueCropper }
}

declare module 'vue-cropper/next/lib/vue-cropper.vue' {
  import VueCropper from 'vue-cropper/next'
  export default VueCropper
}

// 解决 vue-cropper 包内部相对路径导入的类型问题
declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}