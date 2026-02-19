module.exports = {
    eslint: {
        enable: false
    },
    webpack: {
        configure: (webpackConfig) => {
            const plugins = (webpackConfig.plugins || []).map((plugin) => {
                if (plugin && plugin.constructor && plugin.constructor.name === 'HtmlWebpackPlugin') {
                    if (plugin.userOptions) plugin.userOptions.inject = false;
                    if (plugin.options) plugin.options.inject = false;
                }
                return plugin;
            });

            return {
                ...webpackConfig,
                plugins,
                optimization: {
                    ...webpackConfig.optimization,
                    splitChunks: {
                        cacheGroups: {
                            vendor: {
                                name: 'vendors',
                                test: /[\\/]node_modules[\\/]/,
                                chunks: 'all',
                            },
                            renderer: {
                                name: 'renderer',
                                test: /[\\/]node_modules[\\/]@nitrots[\\/]nitro-renderer[\\/]/,
                                chunks: 'all',
                            }
                        }
                    }
                },
                module: {
                    ...webpackConfig.module,
                    rules: [
                        {
                            test: /\.mjs$/,
                            include: /node_modules/,
                            type: 'javascript/auto'
                        },
                        ...webpackConfig.module.rules.map((rule) => {
                            if (!rule.oneOf) return rule;

                            return {
                                ...rule,
                                oneOf: rule.oneOf.map((ruleObject) => {
                                    if (!new RegExp(ruleObject.test).test('.ts') || !ruleObject.include) return ruleObject;

                                    return { ...ruleObject, include: undefined };
                                })
                            };
                        })
                    ]
                }
            };
        }
    }
}
