#! /usr/bin/env zx
import * as esbuild from 'esbuild'
import esbuildPluginLicense from 'esbuild-plugin-license';

const CORE_LICENSE = `MIT License
Copyright (c) 2022-present vuejs
Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:
The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
`;
(async () => {
  await esbuild.build({
    bundle: true,
    entryPoints: ["index.js"],
    outfile: "outfile.cjs",
    format: "cjs",
    platform: "node",
    target: "node14",
    plugins: [
      esbuildPluginLicense({
        thirdParty: {
          includePrivate: false,
          output: {
            file: "LICENSE",
            // Template function that can be defined to customize report output
            template(allDependencies) {
              const dependencies = allDependencies.filter(
                (d) => d.packageJson.name !== "c-vue"
              );
              const licenseText =
                `# c-vue core license\n\n` +
                `c-vue is released under the MIT license:\n\n` +
                CORE_LICENSE +
                `\n## Licenses of bundled dependencies\n\n` +
                `The published c-vue artifact additionally contains code with the following licenses:\n` +
                [
                  ...new Set(
                    dependencies.map(
                      (dependency) => dependency.packageJson.license
                    )
                  ),
                ].join(", ") +
                "\n\n" +
                `## Bundled dependencies\n\n` +
                dependencies
                  .map((dependency) => {
                    return (
                      `## ${dependency.packageJson.name}\n\n` +
                      `License: ${dependency.packageJson.license}\n` +
                      `By: ${dependency.packageJson.author.name}\n` +
                      `Repository: ${dependency.packageJson.repository.url}\n\n` +
                      dependency.licenseText
                        .split("\n")
                        .map((line) => (line ? `> ${line}` : ">"))
                        .join("\n")
                    );
                  })
                  .join("\n\n");
              return licenseText;
            },
          },
        },
      }),
    ],
  });
  
})()
