'use strict';

var _ = require('lodash'),

    intersection = function() {
        var args = [].slice.call(arguments),
            intersected = [];

        args[0].forEach(function(name) {
            if(name in args[1]) {
                intersected.push(name);
            }
        });

        return intersected;
    },

    request_populate = function(request) {
        if(request.method === 'GET') {
            request.data = request.query;
        } else {
            request.data = request.body;
        }

        if(
            Object.prototype.toString.call(request.data) === '[object Object]' &&
            !Object.keys(request.data).length
        ) {
            request.data = null;
        }
    },
    response_populate = function(response) {
        var send = function(code, data) {
            if(!data) {
                response.sendStatus(code);
            } else {
                response.status(code).send(data);
            }
        };

        response.ok = function(data) {
            send(200, data);
        };
        response.fail = function(data) {
            send(400, data || 'Bad Request');
        };
        response.err = response.error = function(data) {
            send(500, data || 'Server Internal Error');
        };

        response.bad_request = response.badRequest = response.fail;
        response.unauthorized = function(data) {
            send(401, data);
        };
        response.forbidden = function(data) {
            send(403, data);
        };
        response.not_found = response.notFound = function(data) {
            send(404, data);
        };
    },

    populate = function(options, next) {
        var populated_object = options.populated_object,
            rewrited = intersection(options.list, populated_object),
            error = null;

        if(!rewrited.length) {
            options.populate_function(populated_object);
        } else {
            error = new Error(_.template('Some module rewrite response. <%= type %>: <%= keys %>.')({
                type: options.type,
                keys: rewrited
            }));
        }

        next(error);
    },

    middleware = function(callback) {
        return function(options) {
            return callback;
        };
    };

module.exports = {
    request: middleware(function(request, response, next) {
        populate({
            type: 'Request',
            populated_object: request,
            list: [
                'data'
            ],
            populate_function: request_populate
        }, next);
    }),
    response: middleware(function(request, response, next) {
        populate({
            type: 'Response',
            populated_object: response,
            list: [
                'ok',
                'fail',
                'err', 'error',

                'bad_request', 'badRequest',
                'unauthorized',
                'forbidden',
                'not_found', 'notFound'
            ],
            populate_function: response_populate
        }, next);
    })
};
