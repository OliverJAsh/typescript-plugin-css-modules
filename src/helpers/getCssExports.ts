import path from 'path';
import Processor from 'postcss/lib/processor';
import less from 'less';
import sass from 'sass';
import stylus from 'stylus';
import { CSSExports, extractICSS } from 'icss-utils';
import { RawSourceMap } from 'source-map-js';
import tsModule from 'typescript/lib/tsserverlibrary';
import { createMatchPath } from 'tsconfig-paths';
import { sassTildeImporter } from '../importers/sassTildeImporter';
import { Options, CustomRenderer } from '../options';
import { Logger } from './logger';

export const enum FileType {
  css = 'css',
  less = 'less',
  sass = 'sass',
  scss = 'scss',
  styl = 'styl',
}

export const getFileType = (fileName: string): FileType => {
  if (fileName.endsWith('.css')) return FileType.css;
  if (fileName.endsWith('.less')) return FileType.less;
  if (fileName.endsWith('.sass')) return FileType.sass;
  if (fileName.endsWith('.styl')) return FileType.styl;
  return FileType.scss;
};

const getFilePath = (fileName: string) => path.dirname(fileName);

export interface CSSExportsWithSourceMap {
  classes: CSSExports;
  css?: string;
  sourceMap?: RawSourceMap;
}

export const getCssExports = ({
  css,
  fileName,
  logger,
  options,
  processor,
  compilerOptions,
}: {
  css: string;
  fileName: string;
  logger: Logger;
  options: Options;
  processor: Processor;
  compilerOptions: tsModule.CompilerOptions;
}): CSSExportsWithSourceMap => {
  try {
    const fileType = getFileType(fileName);
    const rendererOptions = options.rendererOptions || {};

    let transformedCss = '';
    let sourceMap: string | undefined;

    if (options.customRenderer) {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const customRenderer = require(options.customRenderer) as CustomRenderer;
      transformedCss = customRenderer(css, {
        fileName,
        logger,
        compilerOptions,
      });
    } else {
      switch (fileType) {
        case FileType.less:
          less.render(
            css,
            {
              syncImport: true,
              filename: fileName,
              ...(rendererOptions.less || {}),
            } as Less.Options,
            (error, output) => {
              if (error || output === undefined) throw error;
              transformedCss = output.css.toString();
            },
          );
          break;

        case FileType.scss:
        case FileType.sass:
          const filePath = getFilePath(fileName);
          const { includePaths, ...sassOptions } = rendererOptions.sass || {};
          const { baseUrl, paths } = compilerOptions;
          const matchPath =
            baseUrl && paths
              ? createMatchPath(path.resolve(baseUrl), paths)
              : null;

          const aliasImporter: sass.Importer = (url) => {
            const newUrl = matchPath !== null ? matchPath(url) : undefined;
            return newUrl ? { file: newUrl } : null;
          };

          const importers = [aliasImporter, sassTildeImporter];

          const result = sass.renderSync({
            file: fileName,
            indentedSyntax: fileType === FileType.sass,
            includePaths: [filePath, 'node_modules', ...(includePaths || [])],
            sourceMap: 'm.map',
            importer: importers,
            ...sassOptions,
          });

          transformedCss = result.css.toString();
          sourceMap = result.map?.toString();
          break;

        case FileType.styl:
          transformedCss = stylus(css, {
            ...(rendererOptions.stylus || {}),
            filename: fileName,
          }).render();
          break;

        default:
          transformedCss = css;
          break;
      }
    }

    const processedCss = processor.process(transformedCss, {
      from: fileName,
      map: {
        inline: false,
        prev: sourceMap,
      },
    });

    return {
      classes: processedCss.root
        ? extractICSS(processedCss.root).icssExports
        : {},
      css: processedCss.css,
      sourceMap: processedCss.map.toJSON(),
    };
  } catch (e) {
    logger.error(e);
    return { classes: {} };
  }
};
