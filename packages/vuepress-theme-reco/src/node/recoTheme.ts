import { activeHeaderLinksPlugin } from '@vuepress/plugin-active-header-links'
import { backToTopPlugin } from '@vuepress/plugin-back-to-top'
import { bulletinPopoverPlugin } from '@vuepress-reco/vuepress-plugin-bulletin-popover'
import { codeCopyPlugin } from '@vuepress-reco/vuepress-plugin-code-copy'
import { commentsPlugin } from '@vuepress-reco/vuepress-plugin-comments'
import { containerPlugin } from '@vuepress/plugin-container'
import { markdownTaskPlugin } from '@vuepress-reco/vuepress-plugin-markdown-task'
import { externalLinkIconPlugin } from '@vuepress/plugin-external-link-icon'
import { gitPlugin } from '@vuepress/plugin-git'
import { nprogressPlugin } from '@vuepress/plugin-nprogress'
import { pagePlugin } from '@vuepress-reco/vuepress-plugin-page'
import { palettePlugin } from '@vuepress/plugin-palette'
import { path, fs, getDirname } from 'vuepress/utils'
import { prismjsPlugin } from '@vuepress/plugin-prismjs'
import { registerComponentsPlugin } from '@vuepress/plugin-register-components'
import { searchPlugin } from '@vuepress/plugin-search'
import {
  docsearchPlugin,
  DocsearchPluginOptions,
} from '@vuepress/plugin-docsearch'
import { mediumZoomPlugin } from '@vuepress/plugin-medium-zoom'
import { tailwindcssConfig } from '@vuepress-reco/tailwindcss-config'
import { themeDataPlugin } from '@vuepress/plugin-theme-data'
import { viteBundler } from '@vuepress/bundler-vite'
import { vuePreviewPlugin } from '@vuepress-reco/vuepress-plugin-vue-preview'
import { webpackBundler } from '@vuepress/bundler-webpack'
import type { Theme, Page } from 'vuepress/core'
import {
  mergeViteBundlerConfig,
  defaultViteBundlerConfig,
  resolveUserConfig,
} from './resolveBundlerConfig.js'

import { resolveContainerOptions } from './resolveContainer.js'

import type { RecoThemePageData } from '../types/page'

import { pages } from './pages.js'

import postcssImport from 'postcss-import'
import tailwindcssNesting from 'tailwindcss/nesting/index.js'
import tailwindcss from 'tailwindcss'
import autoprefixer from 'autoprefixer'
import postcssEach from 'postcss-each'

const __dirname = getDirname(import.meta.url)

export const recoTheme = (themeConfig: Record<string, unknown>): Theme => {
  const plugins = [
    themeDataPlugin({ themeData: themeConfig }),
    bulletinPopoverPlugin(),
    commentsPlugin(),
    pagePlugin(pages || [], themeConfig),
    gitPlugin(),
    searchPlugin({
      hotKeys: [{ key: 's', ctrl: true }],
    }),
    palettePlugin(),
    mediumZoomPlugin({
      zoomOptions: {
        background: 'inherit',
      },
    }),
    nprogressPlugin(), // todo 在 vuepress-vite 下出现异常
    prismjsPlugin(),
    activeHeaderLinksPlugin({
      headerLinkSelector: 'a.page-catalog-item',
    }),
    containerPlugin(resolveContainerOptions('tip')),
    containerPlugin(resolveContainerOptions('info')),
    containerPlugin(resolveContainerOptions('warning')),
    containerPlugin(resolveContainerOptions('danger')),
    containerPlugin(resolveContainerOptions('details')),
    containerPlugin(resolveContainerOptions('code-group')),
    containerPlugin(resolveContainerOptions('code-group-item')),
    externalLinkIconPlugin(),
    vuePreviewPlugin(),
    registerComponentsPlugin({
      componentsDir: path.join(process.cwd(), themeConfig.sourceDir || '/', './.vuepress/components'),
    }),
    backToTopPlugin(),
    codeCopyPlugin(),
    markdownTaskPlugin(),
  ]

  if (themeConfig.algolia) {
    plugins.push(
      docsearchPlugin(
        (themeConfig.algolia as unknown) as DocsearchPluginOptions
      )
    )
  }

  return {
    name: 'vuepress-theme-reco',
    onInitialized(app) {
      _injectiBuilderOptionsOfRecoTheme(app, themeConfig)
    },
    onWatched(app) {
      _injectiBuilderOptionsOfRecoTheme(app, themeConfig)
    },
    templateBuild: path.resolve(__dirname, '../../templates/index.build.html'),
    templateDev: path.resolve(__dirname, '../../templates/index.dev.html'),

    clientConfigFile: path.resolve(__dirname, '../client/config.js'),

    alias: Object.fromEntries(
      fs
        .readdirSync(path.resolve(__dirname, '../client/components'))
        .filter((file) => file.endsWith('.vue'))
        .map((file) => [
          `@theme/${file}`,
          path.resolve(__dirname, '../client/components', file),
        ])
    ),

    extendsPage: (page: Page<Partial<RecoThemePageData>>) => {
      // save relative file path into page data to generate edit link
      page.data.filePathRelative = page.filePathRelative
      // save title into route meta to generate navbar and series
      page.routeMeta.title = page.title
    },

    plugins,
  }
}

function _injectiBuilderOptionsOfRecoTheme(app, themeConfig) {
  if (themeConfig.primaryColor) {
    tailwindcssConfig.theme.extend.colors.reco.primary = themeConfig.primaryColor as string
  }

  tailwindcssConfig.content.push(
    path.join(themeConfig.sourceDir || '/', './.vuepress/components/*.(vue|html|js)'),
  )

  // todo @vuepress/bundler-webpack 适配问题
  // app.options.bundler.name = '@vuepress/bundler-webpack'

  const userConfig = resolveUserConfig(themeConfig)
  // @ts-ignore
  if (app.options.bundler.name === '@vuepress/bundler-vite') {
    const options = defaultViteBundlerConfig()
    const viteBundlerOptions = mergeViteBundlerConfig(options, userConfig)
    // @ts-ignore
    app.options.bundler = viteBundler(viteBundlerOptions)
  } else {
    // @ts-ignore
    app.options.bundler = webpackBundler({
      chainWebpack: config => {
        // 修改 resolve.extensions
        config.resolve.extensions
          .merge(['.js', '.vue']) // 添加一个新的扩展名
          .end();
      },
      postcss: {
        postcssOptions: {
          plugins: [
          postcssImport,
          tailwindcssNesting,
          tailwindcss(tailwindcssConfig as any),
          autoprefixer({}),
          postcssEach
          ],
        },
      },
    })
  }
}
