'use strict';

var _clone = require('lodash/clone');
var _defaults = require('lodash/defaults');
var _includes = require('lodash/includes');

// var debug = require('debug')('ifnode:config');
var path = require('path');
var _cloneDeepPrimitives = require('./helper/cloneDeepPrimitives');

/**
 *
 * @param   {IFSiteConnectionOptions}   site_config
 * @param   {boolean}                   ssl
 * @returns {string}
 */
function build_origin_value(site_config, ssl) {
    var protocol = ssl?
        'https://' :
        'http://';
    var port = site_config.port?
        ':' + site_config.port :
        '';

    return protocol + site_config.host + port;
}

/**
 *
 * @param   {IFSiteConnectionOptions}   site_config
 * @param   {boolean}                   ssl
 * @returns {Object}
 */
function location_init(site_config, ssl) {
    Object.defineProperties(site_config, {
        'origin': {
            enumerable: true,
            value: build_origin_value(site_config, ssl)
        },
        'url': {
            enumerable: true,
            value: function(pathname) {
                if(pathname[0] !== '/') {
                    pathname = '/' + pathname;
                }

                return this.origin + pathname;
            }
        }
    });

    return site_config;
}

/**
 *
 * @param {Object}                  params
 * @param {Array.<Object, string>}  params.obj
 * @param {Object}                  params.defaults
 */
function set_defaults(params) {
    var obj = params.obj[0],
        prop = params.obj[1],
        defaults = params.defaults;

    obj[prop] = obj[prop]?
        _defaults(obj[prop], defaults) :
        _clone(defaults);
}

/**
 *
 * @param {Object}  config
 * @param {Object}  default_config
 * @param {string}  project_folder
 */
function initialize_properties_config(config, default_config, project_folder) {
    config.environment = config.env = config.environment || config.env || default_config.environment;
    config.application = config.application || {};
    config.components = config.components || {};

    if(config.application.folders) {
        var folders = config.application.folders;

        Object.keys(folders).forEach(function(type) {
            folders[type] = path.resolve(project_folder, folders[type]);
        });

        if(folders.views) {
            set_defaults({
                obj: [config.application, 'express'],
                defaults: {
                    views: config.application.folders.views
                }
            });
        }
    } else {
        config.application.folders = {};
    }


    set_defaults({
        obj: [config.application, 'folders'],
        defaults: default_config.application.folders
    });

    set_defaults({
        obj: [config.application, 'express'],
        defaults: default_config.application.express
    });
}

/**
 *
 * @param {Object}          config
 * @param {IFSiteConfig}    config.site
 * @param {Object}          default_config
 * @param {IFSiteConfig}    default_config.site
 * @param {string}          project_folder
 */
function initialize_site_config(config, default_config, project_folder) {
    /**
     *
     */
    function initialize_ssl_config() {
        /**
         *
         * @param {Object}  config
         * @param {Object}  [default_ssl_config]
         */
        function check_ssl_property(config, default_ssl_config) {
            if(typeof config.ssl !== 'undefined') {
                if(typeof config.ssl === 'boolean') {
                    return;
                }

                if(config.ssl.pfx) {
                    config.ssl.pfx = path.resolve(project_folder, config.ssl.pfx);
                } else if(config.ssl.key && config.ssl.cert) {
                    config.ssl.key = path.resolve(project_folder, config.ssl.key);
                    config.ssl.cert = path.resolve(project_folder, config.ssl.cert);
                }
            } else if(default_ssl_config) {
                set_defaults({
                    obj: [config, 'ssl'],
                    defaults: default_ssl_config
                });
            }
        }

        check_ssl_property(config.site);
        check_ssl_property(config.site.local,  config.site.ssl);
        check_ssl_property(config.site.global, config.site.ssl);
    }

    if(!config.site) {
        config.site = _clone(default_config.site);
        return;
    }

    if(!config.site.connection) {
        config.site.connection = default_config.site.connection;
    }

    if(!config.site.local) {
        config.site.local = _clone(default_config.site.local);
    } else {
        var local_site_config = config.site.local;
        var local_default_config = default_config.site.local;

        if(!local_site_config.host) {
            local_site_config.host = local_default_config.host;
        }

        if(
            _includes(['127.0.0.1', 'localhost'], local_site_config.host) &&
            !local_site_config.port
        ) {
            local_site_config.port = local_default_config.port;
        }
    }

    if(!config.site.global) {
        config.site.global = _clone(config.site.local);
    }

    initialize_ssl_config();
}

/**
 *
 * @param {Object}  config
 */
function initialize_additional_site_config(config) {
    location_init(config.site.local, !!config.site.local.ssl);
    location_init(config.site.global, !!config.site.global.ssl);
}

/**
 *
 * @param {Object}  config
 * @param {Object}  default_config
 */
function initialize_db_config(config, default_config) {
    config.db = _defaults(config.db || {}, default_config.db);
}

/**
 *
 * @param   {Object}    options
 * @returns {IFConfig}
 */
function initialize_default_config(options) {
    var backend_folder = options.backend_folder;
    var env = options.environment || 'local';
    var view_path = path.resolve(backend_folder, 'views/');

    return {
        environment: env,
        site: {
            //ssl: {
            //    key: '',
            //    cert: ''
            //
            //    pfx: ''
            //},
            connection: 'http',
            local: {
                host: 'localhost',
                port: 8080
            },
            global: {
                host: 'localhost'
            }
        },
        application: {
            express: {
                'env': env,
                'views': view_path,
                'view engine': 'jade',
                'x-powered-by': false
            },
            folders: {
                extensions: path.resolve(backend_folder, 'extensions/'),
                components: path.resolve(backend_folder, 'components/'),
                views: view_path,
                controllers: path.resolve(backend_folder, 'controllers/'),
                models: path.resolve(backend_folder, 'models/')
            }
        },

        db: {
            virtual: {
                schema: 'virtual'
            }
        }
    };
}

// var ConfigPrototype = {
//     by_path: function by_path(path) {
//         var parts = path.split('.'),
//             tmp = this,
//             part, i, len = parts.length;
//
//         for (i = 0; i < len; ++i) {
//             part = parts[i];
//             tmp = tmp[part];
//
//             if (typeof tmp === 'undefined') {
//                 return null;
//             }
//         }
//
//         return tmp;
//     },
//     byPath: function byPath(path) {
//         return this.by_path(path);
//     }
// };

/**
 *
 * @param   {Object}    options
 * @returns {IFConfig}
 */
function ConfigurationBuilder(options) {
    var default_config = initialize_default_config(options);

    if(!options.custom_configuration) {
        initialize_additional_site_config(default_config);
        return default_config;
    }

    var config = _cloneDeepPrimitives(options.custom_configuration);

    initialize_properties_config(config, default_config, options.project_folder);
    initialize_site_config(config, default_config, options.project_folder);
    initialize_additional_site_config(config);
    initialize_db_config(config, default_config);

    return config;
}

module.exports = ConfigurationBuilder;
