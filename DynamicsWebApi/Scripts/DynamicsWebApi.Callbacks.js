﻿/// <reference path="c:\GitHub\DynamicsWebApi\DynamicsWebApi\Pages/TestPage.html" />
/// <reference path="jQuery.js" />
/*
 DynamicsWebApi.jQuery v0.1.0 (for Dynamics 365 (online), Dynamics 365 (on-premises), Dynamics CRM 2016, Dynamics CRM Online)
 
 Project references the following javascript libraries:
  > jQuery (jQuery.js) - https://github.com/jquery/jquery

 Copyright (c) 2017. 
 Author: Aleksandr Rogov (https://github.com/AleksandrRogov)
 MIT License

*/

var DWA = {
    Types: {
        ResponseBase: function () {
            /// <field name='oDataContext' type='String'>The context URL (see [OData-Protocol]) for the payload.</field>  
            this.oDataContext = "";
        },
        Response: function () {
            /// <field name='value' type='Object'>Response value returned from the request.</field>  
            DWA.Types.ResponseBase.call(this);

            this.value = {};
        },
        MultipleResponse: function () {
            /// <field name='oDataNextLink' type='String'>The link to the next page.</field>  
            /// <field name='oDataCount' type='Number'>The count of the records.</field>  
            /// <field name='value' type='Array'>The array of the records returned from the request.</field>  
            DWA.Types.ResponseBase.call(this);

            this.oDataNextLink = "";
            this.oDataCount = 0;
            this.value = [];
        },
        FetchXmlResponse: function () {
            /// <field name='value' type='Array'>The array of the records returned from the request.</field>  
            /// <field name='fetchXmlPagingCookie' type='Object'>Paging Cookie object</field>  
            DWA.Types.ResponseBase.call(this);

            this.value = [];
            this.fetchXmlPagingCookie = {
                pageCookies: "",
                pageNumber: 0
            }
        }
    }
}

var sendRequestDefault = function (method, url, successCallback, errorCallback, data, additionalHeaders) {
    /// <summary>Sends a request to given URL with given parameters</summary>
    /// <param name="method" type="String">Method of the request</param>
    /// <param name="url" type="String">The request URL</param>
    /// <param name="successCallback" type="Function">A callback called on success of the request</param>
    /// <param name="errorCallback" type="Function">A callback called when a request failed</param>
    /// <param name="data" type="Object" optional="true">Data to send in the request</param>
    /// <param name="additionalHeaders" type="Object" optional="true">Object with additional headers.<para>IMPORTANT! This object does not contain default headers needed for every request.</para></param>

    var request = {
        type: method,
        contentType: "application/json; charset=utf-8",
        datatype: "json",
        url: url,
        beforeSend: function (xhr) {

            //Specifying this header ensures that the results will be returned as JSON.             
            xhr.setRequestHeader("Accept", "application/json");
            xhr.setRequestHeader("OData-Version", "4.0");
            xhr.setRequestHeader("OData-MaxVersion", "4.0");

            //set additional headers
            if (additionalHeaders != null) {
                var headerKeys = Object.keys(additionalHeaders);

                for (var i = 0; i < headerKeys.length; i++) {
                    xhr.setRequestHeader(headerKeys[i], additionalHeaders[headerKeys[i]]);
                }
            }
        },
        success: function (data, testStatus, xhr) {
            successCallback(xhr);
        },
        error: errorCallback
    };

    if (data != null) {
        request.data = window.JSON.stringify(data);
    }

    $.ajax(request);
}

var DynamicsWebApi = function (config) {
    /// <summary>DynamicsWebApi - a Microsoft Dynamics CRM Web API helper library. Current version uses Callbacks instead of Promises.</summary>
    ///<param name="config" type="Object">
    /// DynamicsWebApi Configuration object
    ///<para>   config.webApiVersion (String).
    ///             The version of Web API to use, for example: "8.1"</para>
    ///<para>   config.webApiUrl (String).
    ///             A String representing a URL to Web API (webApiVersion not required if webApiUrl specified) [optional, if used inside of CRM]</para>
    ///</param>

    var _context = function () {
        ///<summary>
        /// Private function to the context object.
        ///</summary>
        ///<returns>Context</returns>
        if (typeof GetGlobalContext != "undefined")
        { return GetGlobalContext(); }
        else {
            if (typeof Xrm != "undefined") {
                return Xrm.Page.context;
            }
            else { throw new Error("Context is not available."); }
        }
    };

    var isCrm8 = function () {
        /// <summary>
        /// Indicates whether it's CRM 2016 (and later) or earlier. 
        /// Used to check if Web API is available.
        /// </summary>

        //isOutlookClient is removed in CRM 2016 
        return typeof DynamicsWebApi._context().isOutlookClient == 'undefined';
    };

    var _getClientUrl = function () {
        ///<summary>
        /// Private function to return the server URL from the context
        ///</summary>
        ///<returns>String</returns>

        var clientUrl = Xrm.Page.context.getClientUrl();

        if (clientUrl.match(/\/$/)) {
            clientUrl = clientUrl.substring(0, clientUrl.length - 1);
        }
        return clientUrl;
    };

    var _webApiVersion = "8.0";
    var _webApiUrl = null;

    var _initUrl = function () {
        _webApiUrl = _getClientUrl() + "/api/data/v" + _webApiVersion + "/";
    }

    _initUrl();

    var _dateReviver = function (key, value) {
        ///<summary>
        /// Private function to convert matching string values to Date objects.
        ///</summary>
        ///<param name="key" type="String">
        /// The key used to identify the object property
        ///</param>
        ///<param name="value" type="String">
        /// The string value representing a date
        ///</param>
        var a;
        if (typeof value === 'string') {
            a = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.exec(value);
            if (a) {
                return new Date(value);
            }
        }
        return value;
    };

    var _errorHandler = function (req) {
        ///<summary>
        /// Private function return an Error object to the errorCallback
        ///</summary>
        ///<param name="req" type="XMLHttpRequest">
        /// The XMLHttpRequest response that returned an error.
        ///</param>
        ///<returns>Error</returns>
        return new Error("Error : " +
              req.status + ": " +
              req.statusText + ": " +
              JSON.parse(req.responseText).error.message);
    };

    var _parameterCheck = function (parameter, message) {
        ///<summary>
        /// Private function used to check whether required parameters are null or undefined
        ///</summary>
        ///<param name="parameter" type="Object">
        /// The parameter to check;
        ///</param>
        ///<param name="message" type="String">
        /// The error message text to include when the error is thrown.
        ///</param>
        if ((typeof parameter === "undefined") || parameter === null) {
            throw new Error(message);
        }
    };
    var _stringParameterCheck = function (parameter, message) {
        ///<summary>
        /// Private function used to check whether required parameters are null or undefined
        ///</summary>
        ///<param name="parameter" type="String">
        /// The string parameter to check;
        ///</param>
        ///<param name="message" type="String">
        /// The error message text to include when the error is thrown.
        ///</param>
        if (typeof parameter != "string") {
            throw new Error(message);
        }
    };
    var _arrayParameterCheck = function (parameter, message) {
        ///<summary>
        /// Private function used to check whether required parameters are null or undefined
        ///</summary>
        ///<param name="parameter" type="String">
        /// The string parameter to check;
        ///</param>
        ///<param name="message" type="String">
        /// The error message text to include when the error is thrown.
        ///</param>
        if (parameter.constructor !== Array) {
            throw new Error(message);
        }
    };
    var _numberParameterCheck = function (parameter, message) {
        ///<summary>
        /// Private function used to check whether required parameters are null or undefined
        ///</summary>
        ///<param name="parameter" type="Number">
        /// The string parameter to check;
        ///</param>
        ///<param name="message" type="String">
        /// The error message text to include when the error is thrown.
        ///</param>
        if (typeof parameter != "number") {
            throw new Error(message);
        }
    };
    var _boolParameterCheck = function (parameter, message) {
        ///<summary>
        /// Private function used to check whether required parameters are null or undefined
        ///</summary>
        ///<param name="parameter" type="Boolean">
        /// The string parameter to check;
        ///</param>
        ///<param name="message" type="String">
        /// The error message text to include when the error is thrown.
        ///</param>
        if (typeof parameter != "boolean") {
            throw new Error(message);
        }
    };

    var _guidParameterCheck = function (parameter, message) {
        ///<summary>
        /// Private function used to check whether required parameter is a valid GUID
        ///</summary>
        ///<param name="parameter" type="String">
        /// The GUID parameter to check;
        ///</param>
        ///<param name="message" type="String">
        /// The error message text to include when the error is thrown.
        ///</param>
        /// <returns type="String" />

        try {
            var match = /[0-9A-F]{8}[-]?([0-9A-F]{4}[-]?){3}[0-9A-F]{12}/i.exec(parameter)[0];

            return match;
        }
        catch (error) {
            throw new Error(message);
        }
    }

    var _callbackParameterCheck = function (callbackParameter, message) {
        ///<summary>
        /// Private function used to check whether required callback parameters are functions
        ///</summary>
        ///<param name="callbackParameter" type="Function">
        /// The callback parameter to check;
        ///</param>
        ///<param name="message" type="String">
        /// The error message text to include when the error is thrown.
        ///</param>
        if (typeof callbackParameter != "function") {
            throw new Error(message);
        }
    }

    var _sendRequest = sendRequestDefault;

    var retrieveMultipleOptions = function () {
        return {
            type: "",
            id: "",
            select: [],
            filter: "",
            maxPageSize: 1,
            count: true,
            top: 1,
            orderBy: [],
            includeAnnotations: ""
        }
    };

    var setConfig = function (config) {
        ///<summary>Sets the configuration parameters for DynamicsWebApi helper.</summary>
        ///<param name="config" type="Object">
        /// DynamicsWebApi Configuration object
        ///<para>   config.webApiVersion (String). 
        ///             The version of Web API to use, for example: "8.1"</para>
        ///<para>   config.webApiUrl (String).
        ///             A String representing a URL to Web API (webApiVersion not required if webApiUrl specified) [optional, if used inside of CRM]</para>
        ///</param>

        if (config.webApiVersion != null) {
            _stringParameterCheck(config.webApiVersion, "DynamicsWebApi.setConfig requires config.webApiVersion is a string.");
            _webApiVersion = config.webApiVersion;
            _initUrl();
        }

        if (config.webApiUrl != null) {
            _stringParameterCheck(config.webApiUrl, "DynamicsWebApi.setConfig requires config.webApiUrl is a string.");
            _webApiUrl = config.webApiUrl;
        }

        if (config.sendRequest != null) {
            _sendRequest = config.sendRequest;
        }
    }

    if (config != null)
        setConfig(config);

    var convertOptions = function (options, methodName, joinSymbol) {
        /// <param name="options" type="dwaRequest">Options</param>
        /// <returns type="String" />

        joinSymbol = joinSymbol != null ? joinSymbol : "&";

        var optionsArray = [];

        if (options.collection == null)
            _parameterCheck(options.collection, "DynamicsWebApi." + methodName + " requires request.collection parameter");
        else
            _stringParameterCheck(options.collection, "DynamicsWebApi." + methodName + " requires the request.collection parameter is a string.");

        if (options.select != null && options.select.length) {
            _arrayParameterCheck(options.select, "DynamicsWebApi." + methodName + " requires the request.select parameter is an array.");
            optionsArray.push("$select=" + options.select.join(','));
        }

        if (options.filter != null && options.filter.length) {
            _stringParameterCheck(options.filter, "DynamicsWebApi." + methodName + " requires the request.filter parameter is a string.");
            optionsArray.push("$filter=" + options.filter);
        }

        if (options.maxPageSize != null) {
            _numberParameterCheck(options.maxPageSize, "DynamicsWebApi." + methodName + " requires the request.maxPageSize parameter is a number.");
        }

        if (options.count != null) {
            _boolParameterCheck(options.count, "DynamicsWebApi." + methodName + " requires the request.count parameter is a boolean.");
            optionsArray.push("$count=" + options.count);
        }

        if (options.top != null) {
            _intParameterCheck(options.top, "DynamicsWebApi." + methodName + " requires the request.top parameter is a number.");
            optionsArray.push("$top=" + options.top);
        }

        if (options.orderBy != null && options.orderBy.length) {
            _arrayParameterCheck(options.orderBy, "DynamicsWebApi." + methodName + " requires the request.orderBy parameter is an array.");
            optionsArray.push("$orderBy=" + options.orderBy.join(','));
        }

        if (options.prefer != null) {
            _stringParameterCheck(options.prefer, "DynamicsWebApi." + methodName + " requires the request.prefer parameter is a string.");
        }

        if (options.ifmatch != null && options.ifnonematch != null) {
            throw Error("DynamicsWebApi." + methodName + ". Either one of request.ifmatch or request.ifnonematch parameters shoud be used in a call, not both.")
        }

        if (options.ifmatch != null) {
            _stringParameterCheck(options.ifmatch, "DynamicsWebApi." + methodName + " requires the request.ifmatch parameter is a string.");
        }

        if (options.ifnonematch != null) {
            _stringParameterCheck(options.ifnonematch, "DynamicsWebApi." + methodName + " requires the request.ifnonematch parameter is a string.");
        }

        if (options.expand != null && options.expand.length) {
            _arrayParameterCheck(options.expand, "DynamicsWebApi." + methodName + " requires the request.expand parameter is an array.");
            var expandOptionsArray = [];
            for (var i = 0; i < options.expand.length; i++) {
                var expandOptions = convertOptions(options.expand[i], methodName + " $expand", ";");
                if (expandOptions.length) {
                    expandOptions = "(" + expandOptions + ")";
                }
                expandOptionsArray.push(options.expand[i].property + expandOptions);
            }
            optionsArray.push("$expand=" + encodeURI(expandOptionsArray.join(",")));
        }

        if (optionsArray.length > 0)
            return optionsArray.join(joinSymbol);

        return "";
    }

    var convertRequestToLink = function (options, methodName) {
        /// <summary>Builds the Web Api query string based on a passed options object parameter.</summary>
        /// <param name="options" type="dwaRequest">Options</param>
        /// <returns type="String" />

        var url = options.collection.toLowerCase();

        if (options.id != null) {
            _guidParameterCheck(options.id, "DynamicsWebApi." + methodName + " requires request.id parameter is a guid");
            url += "(" + options.id + ")";
        }

        var query = convertOptions(options);

        if (query)
            url += "?" + query;

        return url;
    };

    var createRecord = function (object, collection, returnData, successCallback, errorCallback) {
        ///<summary>
        /// Sends an asynchronous request to create a new record.
        ///</summary>
        ///<param name="object" type="Object">
        /// A JavaScript object with properties corresponding to the Schema name of
        /// entity attributes that are valid for create operations.
        ///</param>
        ///<param name="collection" type="String">
        /// The Logical Name of the Entity Collection name to create.
        /// For an Account record, use "accounts"
        ///</param>
        ///<param name="returnData" type="Boolean" optional="true">
        /// If indicated and "true" the operation returns a created object
        ///</param>
        /// <returns type="Promise" />
        ///<param name="successCallback" type="Function">
        /// The function that will be passed through and be called by a successful response. 
        /// This function can accept the returned record as a parameter.
        /// </param>
        ///<param name="errorCallback" type="Function">
        /// The function that will be passed through and be called by a failed response. 
        /// This function must accept an Error object as a parameter.
        /// </param>

        _parameterCheck(object, "DynamicsWebApi.create requires the object parameter.");
        _stringParameterCheck(collection, "DynamicsWebApi.create requires the collection parameter is a string.");
        _callbackParameterCheck(successCallback, "DynamicsWebApi.create requires the successCallback is a function.");
        _callbackParameterCheck(errorCallback, "DynamicsWebApi.create requires the errorCallback is a function.");

        var headers = null;

        if (returnData) {
            _boolParameterCheck(returnData, "DynamicsWebApi.create requires the returnData parameter a boolean.");
            headers = { "Prefer": "return=representation" };
        }

        var onSuccess = function (xhr) {
            if (returnData) {
                successCallback(data);
            }
            else {
                var entityUrl = xhr.getResponseHeader('odata-entityid');
                var id = /[0-9A-F]{8}[-]?([0-9A-F]{4}[-]?){3}[0-9A-F]{12}/i.exec(entityUrl)[0];
                successCallback(id);
            }
        }

        var onError = function (xhr) {
            errorCallback(_errorHandler(xhr));
        }

        _sendRequest("POST", _webApiUrl + collection.toLowerCase(), onSuccess, onError, object, headers);
    };

    var updateRecord = function (id, collection, object, returnData, select, successCallback, errorCallback) {
        ///<summary>
        /// Sends an asynchronous request to update a record.
        ///</summary>
        ///<param name="id" type="String">
        /// A String representing the GUID value for the record to retrieve.
        ///</param>
        ///<param name="object" type="Object">
        /// A JavaScript object with properties corresponding to the logical names for
        /// entity attributes that are valid for update operations.
        ///</param>
        ///<param name="collection" type="String">
        /// The Logical Name of the Entity Collection name to retrieve.
        /// For an Account record, use "accounts"
        ///</param>
        ///<param name="returnData" type="Boolean" optional="true">
        /// If indicated and "true" the operation returns an updated object
        ///</param>
        ///<param name="select" type="Array" optional="true">
        /// Limits returned properties with updateRequest when returnData equals "true". 
        ///</param>
        ///<param name="successCallback" type="Function">
        /// The function that will be passed through and be called by a successful response. 
        /// This function must accept the returned record as a parameter.
        /// </param>
        ///<param name="errorCallback" type="Function">
        /// The function that will be passed through and be called by a failed response. 
        /// This function must accept an Error object as a parameter.
        /// </param>

        _stringParameterCheck(id, "DynamicsWebApi.update requires the id parameter.");
        id = _guidParameterCheck(id, "DynamicsWebApi.update requires the id is GUID.")
        _parameterCheck(object, "DynamicsWebApi.update requires the object parameter.");
        _stringParameterCheck(collection, "DynamicsWebApi.update requires the collection parameter.");
        _callbackParameterCheck(successCallback, "DynamicsWebApi.update requires the successCallback parameter is a function.");
        _callbackParameterCheck(errorCallback, "DynamicsWebApi.update requires the errorCallback parameter is a function.");

        var headers = null;

        if (returnData != null) {
            _boolParameterCheck(returnData, "DynamicsWebApi.update requires the returnData parameter a boolean.");
            headers = { "Prefer": "return=representation" };
        }

        var systemQueryOptions = "";

        if (select != null) {
            _arrayParameterCheck(select, "DynamicsWebApi.update requires the select parameter an array.");

            if (select != null && select.length > 0) {
                systemQueryOptions = "?" + select.join(",");
            }
        }

        var onSuccess = function (xhr) {
            returnData
                ? successCallback(JSON.parse(xhr.responseText, _dateReviver))
                : successCallback();
        };

        var onError = function (xhr) {
            errorCallback(_errorHandler(xhr));
        }

        _sendRequest("PATCH", _webApiUrl + collection.toLowerCase() + "(" + id + ")" + systemQueryOptions, onSuccess, onError, object, headers);
    };
    var updateSingleProperty = function (id, collection, keyValuePair, successCallback, errorCallback) {
        ///<summary>
        /// Sends an asynchronous request to update a single value in the record.
        ///</summary>
        ///<param name="id" type="String">
        /// A String representing the GUID value for the record to retrieve.
        ///</param>
        ///<param name="keyValuePair" type="Object">
        /// keyValuePair object with a logical name of the field as a key and a value. Example:
        /// <para>{subject: "Update Record"}</para>
        ///</param>
        ///<param name="collection" type="String">
        /// The Logical Name of the Entity Collection name to retrieve.
        /// For an Account record, use "accounts"
        ///</param>
        ///<param name="successCallback" type="Function">
        /// The function that will be passed through and be called by a successful response. 
        /// This function must accept the returned record as a parameter.
        /// </param>
        ///<param name="errorCallback" type="Function">
        /// The function that will be passed through and be called by a failed response. 
        /// This function must accept an Error object as a parameter.
        /// </param>

        _stringParameterCheck(id, "DynamicsWebApi.updateSingleProperty requires the id parameter.");
        id = _guidParameterCheck(id, "DynamicsWebApi.updateSingleProperty requires the id is GUID.")
        _parameterCheck(keyValuePair, "DynamicsWebApi.updateSingleProperty requires the keyValuePair parameter.");
        _stringParameterCheck(collection, "DynamicsWebApi.updateSingleProperty requires the collection parameter.");
        _callbackParameterCheck(successCallback, "DynamicsWebApi.updateSingleProperty requires the successCallback parameter is a function.");
        _callbackParameterCheck(errorCallback, "DynamicsWebApi.updateSingleProperty requires the errorCallback parameter is a function.");

        var onSuccess = function (xhr) {
            successCallback();
        };

        var onError = function (xhr) {
            errorCallback(_errorHandler(xhr));
        }

        var key = Object.keys(keyValuePair)[0];
        var keyValue = keyValuePair[key];

        _sendRequest("PUT", _webApiUrl + collection.toLowerCase() + "(" + id + ")/" + key, onSuccess, onError, { value: keyValue });
    };

    var deleteRequest = function (id, collection, propertyName, successCallback, errorCallback) {
        ///<summary>
        /// Sends an asynchronous request to delete a record.
        ///</summary>
        ///<param name="id" type="String">
        /// A String representing the GUID value for the record to delete.
        ///</param>
        ///<param name="collection" type="String">
        /// The Logical Name of the Entity Collection name to delete.
        /// For an Account record, use "accounts"
        ///</param>
        ///<param name="propertyName" type="String" optional="true">
        /// The name of the property which needs to be emptied. Instead of removing a whole record
        /// only the specified property will be cleared.
        ///</param>
        ///<param name="successCallback" type="Function">
        /// The function that will be passed through and be called by a successful response. 
        /// This function must accept the returned record as a parameter.
        /// </param>
        ///<param name="errorCallback" type="Function">
        /// The function that will be passed through and be called by a failed response. 
        /// This function must accept an Error object as a parameter.
        /// </param>

        _stringParameterCheck(id, "DynamicsWebApi.deleteRequest requires the id parameter.");
        id = _guidParameterCheck(id, "DynamicsWebApi.deleteRequest requires the id is GUID.")
        _stringParameterCheck(collection, "DynamicsWebApi.deleteRequest requires the collection parameter.");
        _callbackParameterCheck(successCallback, "DynamicsWebApi.deleteRequest requires the successCallback parameter is a function.");
        _callbackParameterCheck(errorCallback, "DynamicsWebApi.deleteRequest requires the errorCallback parameter is a function.");

        if (propertyName != null)
            _stringParameterCheck(propertyName, "DynamicsWebApi.deleteRequest requires the propertyName parameter.");

        var url = collection.toLowerCase() + "(" + id + ")";

        if (propertyName != null)
            url += "/" + propertyName;

        var onSuccess = function (xhr) {
            // Nothing is returned to the success function.
            successCallback();
        };

        var onError = function (xhr) {
            errorCallback(_errorHandler(xhr));
        }

        _sendRequest("DELETE", _webApiUrl + url, onSuccess, onError);
    };

    var retrieveRequest = function (request, successCallback, errorCallback) {
        ///<summary>
        /// Sends an asynchronous request to retrieve a record.
        ///</summary>
        ///<param name="request" type="dwaRequest">
        /// An object that represents all possible options for a current request.
        ///</param>
        ///<param name="successCallback" type="Function">
        /// The function that will be passed through and be called by a successful response. 
        /// This function must accept the returned record as a parameter.
        /// </param>
        ///<param name="errorCallback" type="Function">
        /// The function that will be passed through and be called by a failed response. 
        /// This function must accept an Error object as a parameter.
        /// </param>

        _parameterCheck(request, "DynamicsWebApi.retrieve requires the request parameter is an Object.")
        _callbackParameterCheck(successCallback, "DynamicsWebApi.retrieve requires the successCallback parameter is a function.");
        _callbackParameterCheck(errorCallback, "DynamicsWebApi.retrieve requires the errorCallback parameter is a function.");

        var url = convertRequestToLink(request, "retrieve");

        var headers = {};

        if (request.prefer != null) {
            headers['Prefer'] = 'odata.include-annotations=' + request.prefer;
        }

        if (request.ifmatch != null) {
            headers['If-Match'] = request.ifmatch;
        }

        if (request.ifnonematch != null) {
            headers['If-None-Match'] = request.ifnonematch;
        }

        var onSuccess = function (xhr) {
            //JQuery does not provide an opportunity to specify a date reviver so this code
            // parses the xhr.responseText rather than use the data parameter passed by JQuery.
            successCallback(JSON.parse(xhr.responseText, _dateReviver));
        };

        var onError = function (xhr) {
            errorCallback(_errorHandler(xhr));
        }

        _sendRequest("GET", _webApiUrl + url, onSuccess, onError, null, headers);
    }

    var retrieveRecord = function (id, collection, select, expand, successCallback, errorCallback) {
        ///<summary>
        /// Sends an asynchronous request to retrieve a record.
        ///</summary>
        ///<param name="id" type="String">
        /// A String representing the GUID value for the record to retrieve.
        ///</param>
        ///<param name="collection" type="String">
        /// The Logical Name of the Entity Collection name to retrieve.
        /// For an Account record, use "accounts"
        ///</param>
        ///<param name="select" type="Array">
        /// An Array representing the $select OData System Query Option to control which
        /// attributes will be returned. This is a list of Attribute names that are valid for retrieve.
        /// If null all properties for the record will be returned
        ///</param>
        ///<param name="expand" type="String">
        /// A String representing the $expand OData System Query Option value to control which
        /// related records are also returned. This is a comma separated list of of up to 6 entity relationship names
        /// If null no expanded related records will be returned.
        ///</param>
        ///<param name="prefer" type="String">
        /// A String representing the 'Prefer: odata.include-annotations' header value. 
        /// It can be used to include annotations that will provide additional information about the data in selected properties.
        /// <para>Example values: "*"; "OData.Community.Display.V1.FormattedValue" and etc.</para>
        ///</param>
        ///<param name="successCallback" type="Function">
        /// The function that will be passed through and be called by a successful response. 
        /// This function must accept the returned record as a parameter.
        /// </param>
        ///<param name="errorCallback" type="Function">
        /// The function that will be passed through and be called by a failed response. 
        /// This function must accept an Error object as a parameter.
        /// </param>

        _stringParameterCheck(id, "DynamicsWebApi.retrieve requires the id parameter is a string.");
        id = _guidParameterCheck(id, "DynamicsWebApi.retrieve requires the id is GUID.")
        _stringParameterCheck(collection, "DynamicsWebApi.retrieve requires the collection parameter is a string.");
        if (select != null)
            _arrayParameterCheck(select, "DynamicsWebApi.retrieve requires the select parameter is an array.");
        if (expand != null)
            _stringParameterCheck(expand, "DynamicsWebApi.retrieve requires the expand parameter is a string.");
        _callbackParameterCheck(successCallback, "DynamicsWebApi.retrieve requires the successCallback parameter is a function.");
        _callbackParameterCheck(errorCallback, "DynamicsWebApi.retrieve requires the errorCallback parameter is a function.");

        var systemQueryOptions = "";

        if (select != null || expand != null) {
            systemQueryOptions = "?";
            if (select != null && select.length > 0) {
                var selectString = "$select=" + select.join(',');
                if (expand != null) {
                    selectString = selectString + "," + expand;
                }
                systemQueryOptions = systemQueryOptions + selectString;
            }
            if (expand != null) {
                systemQueryOptions = systemQueryOptions + "&$expand=" + expand;
            }
        }

        var headers = null;

        if (prefer != null) {
            _stringParameterCheck(prefer, "DynamicsWebApi.retrieve requires the prefer parameter is a string.");
            headers = { Prefer: 'odata.include-annotations=' + prefer };
        }

        var onSuccess = function (xhr) {
            //JQuery does not provide an opportunity to specify a date reviver so this code
            // parses the xhr.responseText rather than use the data parameter passed by JQuery.
            successCallback(JSON.parse(xhr.responseText, _dateReviver));
        };

        var onError = function (xhr) {
            errorCallback(_errorHandler(xhr));
        }

        _sendRequest("GET", _webApiUrl + collection.toLowerCase() + "(" + id + ")" + systemQueryOptions, onSuccess, onError, null, headers);
    };

    var upsertRecord = function (id, collection, object, ifmatch, ifnonematch, successCallback, errorCallback) {
        ///<summary>
        /// Sends an asynchronous request to Upsert a record.
        ///</summary>
        ///<param name="id" type="String">
        /// A String representing the GUID value for the record to retrieve.
        ///</param>
        ///<param name="object" type="Object">
        /// A JavaScript object with properties corresponding to the logical names for
        /// entity attributes that are valid for upsert operations.
        ///</param>
        ///<param name="collection" type="String">
        /// The Logical Name of the Entity Collection name record to Upsert.
        /// For an Account record, use "accounts".
        ///</param>
        ///<param name="ifmatch" type="String" optional="true">
        /// To prevent a creation of the record use "*". Sets header "If-Match".
        ///</param>
        ///<param name="ifnonematch" type="String" optional="true">
        /// To prevent an update of the record use "*". Sets header "If-None-Match".
        ///</param>
        ///<param name="successCallback" type="Function">
        /// The function that will be passed through and be called by a successful response. 
        /// This function must accept the returned record as a parameter.
        /// </param>
        ///<param name="errorCallback" type="Function">
        /// The function that will be passed through and be called by a failed response. 
        /// This function must accept an Error object as a parameter.
        /// </param>

        _stringParameterCheck(id, "DynamicsWebApi.upsert requires the id parameter.");
        id = _guidParameterCheck(id, "DynamicsWebApi.upsert requires the id is GUID.")

        _parameterCheck(object, "DynamicsWebApi.upsert requires the object parameter.");
        _stringParameterCheck(collection, "DynamicsWebApi.upsert requires the collection parameter.");

        _callbackParameterCheck(successCallback, "DynamicsWebApi.upsert requires the successCallback parameter is a function.");
        _callbackParameterCheck(errorCallback, "DynamicsWebApi.upsert requires the errorCallback parameter is a function.");

        if (ifmatch != null && ifnonematch != null) {
            throw Error("Either one of ifmatch or ifnonematch parameters shoud be used in a call, not both.")
        }

        var headers = null;

        if (ifmatch != null) {
            _stringParameterCheck(ifmatch, "DynamicsWebApi.upsert requires the ifmatch parameter is a string.");

            headers = { 'If-Match': ifmatch };
        }

        if (ifnonematch != null) {
            _stringParameterCheck(ifmatch, "DynamicsWebApi.upsert requires the ifnonematch parameter is a string.");

            headers = { 'If-None-Match': ifnonematch };
        }

        var onSuccess = function (xhr) {
            if (xhr.status == 204) {
                var entityUrl = xhr.getResponseHeader('odata-entityid');
                var id = /[0-9A-F]{8}[-]?([0-9A-F]{4}[-]?){3}[0-9A-F]{12}/i.exec(entityUrl)[0];
                successCallback(id);
            }
            else
                successCallback();
        };

        var onError = function (xhr) {
            if (ifnonematch != null && xhr.status == 412) {
                //if prevent update
                successCallback();
            }
            else if (ifmatch != null && xhr.status == 404) {
                //if prevent create
                successCallback();
            }
            else {
                //rethrow error otherwise
                errorCallback(_errorHandler(xhr));
            }
        };

        _sendRequest("PATCH", _webApiUrl + collection.toLowerCase() + "(" + id + ")", onSuccess, onError, object, headers);

        //$.ajax({
        //    type: "PATCH",
        //    contentType: "application/json; charset=utf-8",
        //    datatype: "json",
        //    url: _webApiUrl + type.toLowerCase() + "s" + "(" + id + ")",
        //    data: jsonEntity,
        //    beforeSend: function (xhr) {
        //        //Specifying this header ensures that the results will be returned as JSON.             
        //        xhr.setRequestHeader("Accept", "application/json");
        //        xhr.setRequestHeader("OData-Version", "4.0");
        //        xhr.setRequestHeader("OData-MaxVersion", "4.0");
        //        if (ifmatch != null) {
        //            xhr.setRequestHeader('If-Match', ifmatch);
        //        }
        //        if (ifnonematch != null) {
        //            xhr.setRequestHeader('If-None-Match', ifnonematch);
        //        }
        //    },
        //    success: function (data, textStatus, xhr) {
        //        if (xhr.status == 204) {
        //            var entityUrl = xhr.getResponseHeader('odata-entityid');
        //            var id = /[0-9A-F]{8}[-]?([0-9A-F]{4}[-]?){3}[0-9A-F]{12}/i.exec(entityUrl)[0];
        //            successCallback(id);
        //        }
        //        else
        //            successCallback();
        //    },
        //    error: function (xhr, textStatus, errorThrown) {
        //        if (ifnonematch != null && xhr.status == 412) {
        //            //if prevent update
        //            successCallback();
        //        }
        //        else if (ifmatch != null && xhr.status == 404) {
        //            //if prevent create
        //            successCallback();
        //        }
        //        else {
        //            //rethrow error otherwise
        //            errorCallback(_errorHandler(xhr));
        //        }
        //    }
        //});
    }

    var countRecords = function (collection, filter, successCallback, errorCallback) {
        ///<summary>
        /// Sends an asynchronous request to count records.
        ///</summary>
        /// <param name="collection" type="String">The Logical Name of the Entity Collection to retrieve. For an Account record, use "accounts".</param>
        /// <param name="filter" type="String" optional="true">Use the $filter system query option to set criteria for which entities will be returned.</param>
        ///<param name="successCallback" type="Function">
        /// The function that will be passed through and be called by a successful response. 
        /// This function must accept the returned record as a parameter.
        /// </param>
        ///<param name="errorCallback" type="Function">
        /// The function that will be passed through and be called by a failed response. 
        /// This function must accept an Error object as a parameter.
        /// </param>

        if (filter == null || (filter != null && !filter.length)) {
            _stringParameterCheck(collection, "DynamicsWebApi.count requires the collection parameter is a string.");
            _callbackParameterCheck(successCallback, "DynamicsWebApi.count requires the successCallback parameter is a function.");
            _callbackParameterCheck(errorCallback, "DynamicsWebApi.count requires the errorCallback parameter is a function.");

            //if filter has not been specified then simplify the request

            var onSuccess = function (xhr) {
                var response = JSON.parse(xhr.responseText);

                successCallback(response ? parseInt(response) : 0);
            };

            var onError = function (xhr) {
                errorCallback(_errorHandler(xhr));
            };

            _sendRequest("GET", _webApiUrl + collection.toLowerCase() + "/$count", onSuccess, onError)
        }
        else {
            return retrieveMultipleRecordsAdvanced({
                collection: collection,
                filter: filter,
                count: true
            }, null, function (response) {
                successCallback(response.oDataCount ? response.oDataCount : 0);
            }, errorCallback);
        }
    }

    var retrieveMultipleRecords = function (collection, select, filter, nextPageLink, successCallback, errorCallback) {
        ///<summary>
        /// Sends an asynchronous request to retrieve records.
        ///</summary>
        /// <param name="collection" type="String">The Logical Name of the Entity Collection to retrieve. For an Account record, use "accounts".</param>
        /// <param name="select" type="Array">Use the $select system query option to limit the properties returned as shown in the following example.</param>
        /// <param name="filter" type="String">Use the $filter system query option to set criteria for which entities will be returned.</param>
        /// <param name="nextPageLink" type="String">Use the value of the @odata.nextLink property with a new GET request to return the next page of data. Pass null to retrieveMultipleOptions.</param>
        ///<param name="successCallback" type="Function">
        /// The function that will be passed through and be called by a successful response. 
        /// This function must accept the returned record as a parameter.
        /// </param>
        ///<param name="errorCallback" type="Function">
        /// The function that will be passed through and be called by a failed response. 
        /// This function must accept an Error object as a parameter.
        /// </param>

        return retrieveMultipleRecordsAdvanced({
            collection: collection,
            select: select,
            filter: filter
        }, nextPageLink, successCallback, errorCallback);
    }

    var retrieveMultipleRecordsAdvanced = function (request, nextPageLink, successCallback, errorCallback) {
        ///<summary>
        /// Sends an asynchronous request to retrieve records.
        ///</summary>
        ///<param name="request" type="Object">
        /// Retrieve multiple request options
        ///<para>   object.collection (String). 
        ///             The Logical Name of the Entity Collection to retrieve. For an Account record, use "accounts".</para>
        ///<para>   object.id (String).
        ///             A String representing the GUID value for the record to retrieve.
        ///<para>   object.select (Array). 
        ///             Use the $select system query option to limit the properties returned as shown in the following example.</para>
        ///<para>   object.filter (String). 
        ///             Use the $filter system query option to set criteria for which entities will be returned.</para>
        ///<para>   object.maxPageSize (Number). 
        ///             Use the odata.maxpagesize preference value to request the number of entities returned in the response.</para>
        ///<para>   object.count (Boolean). 
        ///             Use the $count system query option with a value of true to include a count of entities that match the filter criteria up to 5000. Do not use $top with $count!</para>
        ///<para>   object.top (Number). 
        ///             Limit the number of results returned by using the $top system query option. Do not use $top with $count!</para>
        ///<para>   object.orderBy (Array). 
        ///             Use the order in which items are returned using the $orderby system query option. Use the asc or desc suffix to specify ascending or descending order respectively. The default is ascending if the suffix isn't applied.</para>
        ///<para>   object.prefer (String). 
        ///             Values can be "OData.Community.Display.V1.FormattedValue"; "*" and other - for lookups.</para>
        ///</param>
        ///<param name="select" type="nextPageLink" optional="true">
        /// Use the value of the @odata.nextLink property with a new GET request to return the next page of data. Pass null to request.
        ///</param>
        ///<param name="successCallback" type="Function">
        /// The function that will be passed through and be called by a successful response. 
        /// This function must accept the returned record as a parameter.
        /// </param>
        ///<param name="errorCallback" type="Function">
        /// The function that will be passed through and be called by a failed response. 
        /// This function must accept an Error object as a parameter.
        /// </param>

        _callbackParameterCheck(successCallback, "DynamicsWebApi.retrieveMultiple requires the successCallback parameter is a function.");
        _callbackParameterCheck(errorCallback, "DynamicsWebApi.retrieveMultiple requires the errorCallback parameter is a function.");

        if (nextPageLink != null)
            _stringParameterCheck(nextPageLink, "DynamicsWebApi.retrieveMultiple requires the nextPageLink parameter is a string.");

        var url = nextPageLink == null
            ? convertRequestToLink(request, "retrieveMultiple")
            : nextPageLink;

        var headers = null;

        if (nextPageLink == null) {
            if (request.maxPageSize != null) {
                headers = { 'Prefer': 'odata.maxpagesize=' + request.maxPageSize };
            }
            if (request.includeAnnotations != null) {
                headers = { 'Prefer': 'odata.include-annotations="' + request.includeAnnotations + '"' };
            }
        }

        var onSuccess = function (xhr) {

            var response = JSON.parse(xhr.responseText, _dateReviver);
            if (response['@odata.nextLink'] != null) {
                response.oDataNextLink = response['@odata.nextLink'];
            }
            if (response['@odata.count'] != null) {
                response.oDataCount = response['@odata.count'];
            }
            if (response['@odata.context'] != null) {
                response.oDataContext = response['@odata.context'];
            }

            successCallback(response);
        };

        var onError = function (xhr) {
            errorCallback(_errorHandler(xhr));
        };

        _sendRequest("GET", _webApiUrl + url, onSuccess, onError, null, headers);
    }

    var getPagingCookie = function (pageCookies) {
        var pagingInfo = {};
        var pageNumber = null;

        try {
            //get the page cokies
            pageCookies = unescape(unescape(pageCookies));

            //get the pageNumber
            pageNumber = parseInt(pageCookies.substring(pageCookies.indexOf("=") + 1, pageCookies.indexOf("pagingcookie")).replace(/\"/g, '').trim());

            // this line is used to get the cookie part
            pageCookies = pageCookies.substring(pageCookies.indexOf("pagingcookie"), (pageCookies.indexOf("/>") + 12));
            pageCookies = pageCookies.substring(pageCookies.indexOf("=") + 1, pageCookies.length);
            pageCookies = pageCookies.substring(1, pageCookies.length - 1);

            //replace special character 
            pageCookies = pageCookies.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\"/g, '\'').replace(/\'/g, '&' + 'quot;');

            //append paging-cookie
            pageCookies = "paging-cookie ='" + pageCookies + "'";

            //set the parameter
            pagingInfo.pageCookies = pageCookies;
            pagingInfo.pageNumber = pageNumber;

        } catch (e) {
            throw new Error(e);
        }

        return pagingInfo;
    }

    var fetchXmlRequest = function (collection, fetchXml, includeAnnotations, successCallback, errorCallback) {
        ///<summary>
        /// Sends an asynchronous request to count records.
        ///</summary>
        /// <param name="collection" type="String">The Logical Name of the Entity Collection to retrieve. For an Account record, use "account".</param>
        /// <param name="fetchXml" type="String">FetchXML is a proprietary query language that provides capabilities to perform aggregation.</param>
        /// <param name="includeAnnotations" type="String" optional="true">Use this parameter to include annotations to a result.<para>For example: * or Microsoft.Dynamics.CRM.fetchxmlpagingcookie</para></param>
        ///<param name="successCallback" type="Function">
        /// The function that will be passed through and be called by a successful response. 
        /// This function must accept the returned record as a parameter.
        /// </param>
        ///<param name="errorCallback" type="Function">
        /// The function that will be passed through and be called by a failed response. 
        /// This function must accept an Error object as a parameter.
        /// </param>

        _stringParameterCheck(collection, "DynamicsWebApi.executeFetchXml requires the collection parameter.");
        _stringParameterCheck(fetchXml, "DynamicsWebApi.executeFetchXml requires the fetchXml parameter.");
        _callbackParameterCheck(successCallback, "DynamicsWebApi.executeFetchXml requires the successCallback parameter is a function.");
        _callbackParameterCheck(errorCallback, "DynamicsWebApi.executeFetchXml requires the errorCallback parameter is a function.");

        var headers = null;
        if (includeAnnotations != null) {
            _stringParameterCheck(includeAnnotations, "DynamicsWebApi.executeFetchXml requires the includeAnnotations as a string.");
            headers = { 'Prefer': 'odata.include-annotations="' + includeAnnotations + '"' };
        }

        var encodedFetchXml = encodeURI(fetchXml);

        var onSuccess = function (xhr) {
            var response = JSON.parse(xhr.responseText, _dateReviver);

            if (response['@Microsoft.Dynamics.CRM.fetchxmlpagingcookie'] != null) {
                response.value.fetchXmlPagingCookie = getPagingCookie(response['@Microsoft.Dynamics.CRM.fetchxmlpagingcookie']);
            }

            if (response['@odata.context'] != null) {
                response.oDataContext = response['@odata.context'];
            }

            successCallback(response);
        };

        var onError = function (xhr) {
            errorCallback(_errorHandler(xhr));
        };

        _sendRequest("GET", _webApiUrl + collection.toLowerCase() + "?fetchXml=" + encodedFetchXml, onSuccess, onError, null, headers);
    }

    var associateRequest = function (primarycollection, primaryId, relationshipName, relatedcollection, relatedId, successCallback, errorCallback) {
        /// <summary>Associate for a collection-valued navigation property. (1:N or N:N)</summary>
        /// <param name="primarycollection" type="String">Primary entity collection name.</param>
        /// <param name="primaryId" type="String">Primary entity record id.</param>
        /// <param name="relationshipName" type="String">Relationship name.</param>
        /// <param name="relatedcollection" type="String">Related colletion name.</param>
        /// <param name="relatedId" type="String">Related entity record id.</param>
        ///<param name="successCallback" type="Function">
        /// The function that will be passed through and be called by a successful response. 
        /// This function must accept the returned record as a parameter.
        /// </param>
        ///<param name="errorCallback" type="Function">
        /// The function that will be passed through and be called by a failed response. 
        /// This function must accept an Error object as a parameter.
        /// </param>
        _stringParameterCheck(primarycollection, "DynamicsWebApi.associate requires the primarycollection parameter is a string.");
        _stringParameterCheck(relatedcollection, "DynamicsWebApi.associate requires the relatedcollection parameter is a string.");
        _stringParameterCheck(relationshipName, "DynamicsWebApi.associate requires the relationshipName parameter is a string.");
        primaryId = _guidParameterCheck(primaryId, "DynamicsWebApi.associate requires the primaryId is GUID.");
        relatedId = _guidParameterCheck(relatedId, "DynamicsWebApi.associate requires the relatedId is GUID.");
        _callbackParameterCheck(successCallback, "DynamicsWebApi.associate requires the successCallback parameter is a function.");
        _callbackParameterCheck(errorCallback, "DynamicsWebApi.associate requires the errorCallback parameter is a function.");

        var onSuccess = function (xhr) {
            successCallback();
        };

        var onError = function (xhr) {
            errorCallback(_errorHandler(xhr));
        };

        _sendRequest("POST",
            _webApiUrl + primarycollection + "(" + primaryId + ")/" + relationshipName + "/$ref",
            onSuccess, onError,
            { "@odata.id": _webApiUrl + relatedcollection + "(" + relatedId + ")" });
    }

    var disassociateRequest = function (primarycollection, primaryId, relationshipName, relatedId, successCallback, errorCallback) {
        /// <summary>Disassociate for a collection-valued navigation property.</summary>
        /// <param name="primarycollection" type="String">Primary entity collection name</param>
        /// <param name="primaryId" type="String">Primary entity record id</param>
        /// <param name="relationshipName" type="String">Relationship name</param>
        /// <param name="relatedId" type="String">Related entity record id</param>
        ///<param name="successCallback" type="Function">
        /// The function that will be passed through and be called by a successful response. 
        /// This function must accept the returned record as a parameter.
        /// </param>
        ///<param name="errorCallback" type="Function">
        /// The function that will be passed through and be called by a failed response. 
        /// This function must accept an Error object as a parameter.
        /// </param>

        _stringParameterCheck(primarycollection, "DynamicsWebApi.disassociate requires the primarycollection parameter is a string.");
        _stringParameterCheck(relationshipName, "DynamicsWebApi.disassociate requires the relationshipName parameter is a string.");
        primaryId = _guidParameterCheck(primaryId, "DynamicsWebApi.disassociate requires the primaryId is GUID.");
        relatedId = _guidParameterCheck(relatedId, "DynamicsWebApi.disassociate requires the relatedId is GUID.");
        _callbackParameterCheck(successCallback, "DynamicsWebApi.disassociate requires the successCallback parameter is a function.");
        _callbackParameterCheck(errorCallback, "DynamicsWebApi.disassociate requires the errorCallback parameter is a function.");

        var onSuccess = function (xhr) {
            successCallback();
        };

        var onError = function (xhr) {
            errorCallback(_errorHandler(xhr));
        };

        _sendRequest("DELETE", _webApiUrl + primarycollection + "(" + primaryId + ")/" + relationshipName + "(" + relatedId + ")/$ref", onSuccess, onError);
    }

    var associateSingleValuedRequest = function (collection, id, singleValuedNavigationPropertyName, relatedcollection, relatedId, successCallback, errorCallback) {
        /// <summary>Associate for a single-valued navigation property. (1:N)</summary>
        /// <param name="collection" type="String">Entity collection name that contains an attribute.</param>
        /// <param name="id" type="String">Entity record id that contains a attribute.</param>
        /// <param name="singleValuedNavigationPropertyName" type="String">Single-valued navigation property name (usually it's a Schema Name of the lookup attribute).</param>
        /// <param name="relatedcollection" type="String">Related collection name that the lookup (attribute) points to.</param>
        /// <param name="relatedId" type="String">Related entity record id that needs to be associated.</param>
        ///<param name="successCallback" type="Function">
        /// The function that will be passed through and be called by a successful response. 
        /// This function must accept the returned record as a parameter.
        /// </param>
        ///<param name="errorCallback" type="Function">
        /// The function that will be passed through and be called by a failed response. 
        /// This function must accept an Error object as a parameter.
        /// </param>

        _stringParameterCheck(collection, "DynamicsWebApi.associateSingleValued requires the collection parameter is a string.");
        id = _guidParameterCheck(id, "DynamicsWebApi.associateSingleValued requires the id parameter is GUID.");
        relatedId = _guidParameterCheck(relatedId, "DynamicsWebApi.associateSingleValued requires the relatedId is GUID.");
        _stringParameterCheck(singleValuedNavigationPropertyName, "DynamicsWebApi.associateSingleValued requires the singleValuedNavigationPropertyName parameter is a string.");
        _stringParameterCheck(relatedcollection, "DynamicsWebApi.associateSingleValued requires the relatedcollection parameter is a string.");
        _callbackParameterCheck(successCallback, "DynamicsWebApi.associateSingleValued requires the successCallback parameter is a function.");
        _callbackParameterCheck(errorCallback, "DynamicsWebApi.associateSingleValued requires the errorCallback parameter is a function.");

        var onSuccess = function (xhr) {
            successCallback();
        };

        var onError = function (xhr) {
            errorCallback(_errorHandler(xhr));
        };

        _sendRequest("PUT",
            _webApiUrl + collection + "(" + id + ")/" + singleValuedNavigationPropertyName + "/$ref",
            onSuccess, onError,
            { "@odata.id": _webApiUrl + relatedcollection + "(" + relatedId + ")" });
    }

    var disassociateSingleValuedRequest = function (collection, id, singleValuedNavigationPropertyName, successCallback, errorCallback) {
        /// <summary>Removes a reference to an entity for a single-valued navigation property. (1:N)</summary>
        /// <param name="collection" type="String">Entity collection name that contains an attribute.</param>
        /// <param name="id" type="String">Entity record id that contains a attribute.</param>
        /// <param name="singleValuedNavigationPropertyName" type="String">Single-valued navigation property name (usually it's a Schema Name of the lookup attribute).</param>
        ///<param name="successCallback" type="Function">
        /// The function that will be passed through and be called by a successful response. 
        /// This function must accept the returned record as a parameter.
        /// </param>
        ///<param name="errorCallback" type="Function">
        /// The function that will be passed through and be called by a failed response. 
        /// This function must accept an Error object as a parameter.
        /// </param>

        _stringParameterCheck(collection, "DynamicsWebApi.disassociateSingleValued requires the collection parameter is a string.");
        id = _guidParameterCheck(id, "DynamicsWebApi.disassociateSingleValued requires the id parameter is GUID.");
        _stringParameterCheck(singleValuedNavigationPropertyName, "DynamicsWebApi.disassociateSingleValued requires the singleValuedNavigationPropertyName parameter is a string.");
        _callbackParameterCheck(successCallback, "DynamicsWebApi.disassociateSingleValued requires the successCallback parameter is a function.");
        _callbackParameterCheck(errorCallback, "DynamicsWebApi.disassociateSingleValued requires the errorCallback parameter is a function.");

        var onSuccess = function (xhr) {
            successCallback();
        };

        var onError = function (xhr) {
            errorCallback(_errorHandler(xhr));
        };

        _sendRequest("DELETE", _webApiUrl + collection + "(" + id + ")/" + singleValuedNavigationPropertyName + "/$ref", onSuccess, onError);
    }

    var createInstance = function (config) {
        ///<summary>Creates another instance of DynamicsWebApi helper.</summary>
        ///<param name="config" type="Object">
        /// DynamicsWebApi Configuration object
        ///<para>   config.webApiVersion (String).
        ///             The version of Web API to use, for example: "8.1"</para>
        ///<para>   config.webApiUrl (String).
        ///             A String representing a URL to Web API (webApiVersion not required if webApiUrl specified) [optional, if used inside of CRM]</para>
        ///<para>   config.sendRequest (Function).
        ///             A function that sends a request to Web API</para>
        ///</param>
        /// <returns type="DynamicsWebApi" />

        if (config == null)
            config = {};

        if (config.sendRequest == null) {
            config.sendRequest = _sendRequest;
        }

        return new DynamicsWebApi(config);
    }

    return {
        create: createRecord,
        update: updateRecord,
        upsert: upsertRecord,
        deleteRequest: deleteRequest,
        executeFetchXml: fetchXmlRequest,
        count: countRecords,
        retrieve: retrieveRecord,
        retrieveRequest: retrieveRequest,
        retrieveMultiple: retrieveMultipleRecords,
        retrieveMultipleAdvanced: retrieveMultipleRecordsAdvanced,
        updateSingleProperty: updateSingleProperty,
        associate: associateRequest,
        disassociate: disassociateRequest,
        associateSingleValued: associateSingleValuedRequest,
        disassociateSingleValued: disassociateSingleValuedRequest,
        setConfig: setConfig,
        initializeInstance: createInstance
    }
};

var dynamicsWebApi = new DynamicsWebApi();