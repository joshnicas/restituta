const svgTransformer = require("./node_modules/@expo/metro-config/babel-transformer");

module.exports.transform = ({ src, filename, ...rest }) => {
  if (filename.endsWith(".svg")) {
    return {
      code: `module.exports = ${JSON.stringify(src)};`,
      map: null,
    };
  }

  return svgTransformer.transform({ src, filename, ...rest });
};
