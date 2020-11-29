import { Options as SassOptions } from 'sass';
import tsModule from 'typescript/lib/tsserverlibrary';
import { DotenvConfigOptions } from 'dotenv/types';
import { CSSExports } from 'icss-utils';
import stylus from 'stylus';
import { Logger } from './helpers/logger';

// NOTE: Stylus doesn't directly export RenderOptions.
type StylusRenderOptions = Parameters<typeof stylus>[1];

export interface PostCssOptions {
  excludePlugins?: string[];
  useConfig?: boolean;
}

export interface ExtraSassOptions {
  enableWebpackTildeImports?: boolean;
}

export interface RendererOptions {
  less?: Partial<Less.Options>;
  sass?: Partial<SassOptions> & ExtraSassOptions;
  stylus?: Partial<StylusRenderOptions>;
}

export interface Options {
  classnameTransform?: ClassnameTransformOptions;
  customMatcher?: string;
  customRenderer?: string;
  customTemplate?: string;
  dotenvOptions?: DotenvConfigOptions;
  postCssOptions?: PostCssOptions;
  rendererOptions?: RendererOptions;
}

export type ClassnameTransformOptions =
  | 'asIs'
  | 'camelCase'
  | 'camelCaseOnly'
  | 'dashes'
  | 'dashesOnly';

export interface CustomRendererOptions {
  fileName: string;
  logger: Logger;
  compilerOptions: tsModule.CompilerOptions;
}

export type CustomRenderer = (
  css: string,
  options: CustomRendererOptions,
) => string;

export interface CustomTemplateOptions {
  classes: CSSExports;
  fileName: string;
  logger: Logger;
}

export type CustomTemplate = (
  dts: string,
  options: CustomTemplateOptions,
) => string;
