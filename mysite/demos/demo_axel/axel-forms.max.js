
// file: axel-forms/src/core/command.js
/* AXEL Command (part of AXEL-FORMS)
 *
 * author      : Stéphane Sire
 * contact     : s.sire@oppidoc.fr
 * license     : proprietary
 * last change : 2012-09-05
 *
 * Scripts to interface the AXEL library with a micro-format syntax
 * This allows to use XTiger XML templates without writing Javascript
 *
 * Prerequisites: jQuery + AXEL (https://github.com/ssire/axel)
 *
 * Copyright (c) 2012 Oppidoc SARL, <contact@oppidoc.fr>
 */

/*****************************************************************************\
|                                                                             |
|  AXEL Command                                                               |
|                                                                             |
|  manages commands bound to an HTML page with  a microformat syntax           |
|  the data-target attribute of a command identifies a target editor          |
|  that contains the result of a template transformation                      |
      exposed as $axel.command                                                |
|                                                                             |
|*****************************************************************************|
|                                                                             |
|  Command support:                                                           |
|    register( name, construtor )                                             |
|             register a new command constructor                              |
|                                                                             |
|  Generic methods:                                                           |
|    logError( msg )                                                          |
|             display an error message                                        |
|    getEditor( id )                                                          |
|             returns an editor object associated with a div containing       |
|             the result of a template transformation. The editor object      |
|             has a high level API to interact with AXEL.                     |
|                                                                             |
\*****************************************************************************/
// TODO
// - factorize mandatory attributes checking (add an array of mandatory to check when calling register ?)
// - rendre id obligatoire sur Editor
// - si pas de data-target, prendre le nom du 1er Editor disponible (? legacy avec data-role ?)
// - detecter le cas du template pré-chargé dans une iframe (tester sur le tag name iframe) 
//   et dans ce cas transformer le contenu de la iframe (?)

(function ($axel) {

  /////////////////////////////////////////////////
  // <div> Hosted editor
  /////////////////////////////////////////////////
  function Editor (identifier, node, doc, axelPath ) {
    var spec = $(node),
        name;
    
    this.doc = doc;
    this.axelPath = axelPath;
    this.key = identifier;
    this.templateUrl = spec.attr('data-template');
    this.dataUrl = spec.attr('data-src');
    this.cancelUrl = spec.attr('data-cancel');
    this.transaction = spec.attr('data-transaction');
    this.spec = spec;

    if (this.templateUrl) {
      // 1. adds a class named after the template on 'body' element
      // FIXME: could be added to the div domContainer instead ?
      if (this.templateUrl !== '#') {
        name = this.templateUrl.substring(this.templateUrl.lastIndexOf('/') + 1);
        if (name.indexOf('?') !== -1) {
          name = name.substring(0, name.indexOf('?'));
        }
        $('body', doc).addClass('edition').addClass(name);
      } // otherwise special case with document as template

      // 2. loads and transforms template and optionnal data
      this.initialize();

      // 3. registers optionnal unload callback if transactionnal style
      if (this.cancelUrl) {
        $(window).bind('unload', $.proxy(this, 'reportCancel'));
        // FIXME: works only if self-transformed
      }
    } else {
      $axel.command.logError('Missing data-template attribute to generate the editor "' + this.key + '"');
    }

    // 4. triggers completion event
    $(doc).triggerHandler('AXEL-TEMPLATE-READY', [this]);
  }

  Editor.prototype = {

    attr : function (name) {
      return this.spec.attr(name);
    },

    initialize : function () {
      var errLog = new xtiger.util.Logger(),
          template, data, dataFeed;
      if (this.templateUrl === "#") {
        template = this.doc;
      } else {
        template = xtiger.debug.loadDocument(this.templateUrl, errLog);
      }
      if (template) {
        this.form = new xtiger.util.Form(this.axelPath);
        this.form.setTemplateSource(template);
        if (template !== this.doc) {
          this.form.setTargetDocument(this.doc, this.key, true); // FIXME: "untitled" does not work
        }
        // FIXME: currently "#" notation limited to body (document is the template)
        // because setTemplateSource only accept a document
        this.form.enableTabGroupNavigation();
        this.form.transform(errLog);
        if (this.dataUrl) {
          // loads XML data inside the editor
          data = xtiger.cross.loadDocument(this.dataUrl, errLog);
          if (data) {
            if ($('error > message', data).size() > 0) {
              $axel.command.logError($('error > message', data).text());
              // FIXME: disable commands targeted at this editor ?
            } else {
              dataFeed = new xtiger.util.DOMDataSource(data);
              this.form.loadData(dataFeed, errLog);
            }
          }
        }
      }
      if (errLog.inError()) {
        $axel.command.logError(errLog.printErrors());
      }
    },

    // Removes all data in the editor and starts a new editing session
    // Due to limitations in AXEL it reloads the templates and transforms it again
    reset : function () {
      var errLog = new xtiger.util.Logger();
      if (this.form) {
        this.form.transform(errLog);
      }
      if (errLog.inError()) {
        $axel.command.logError(errLog.printErrors());
      }
    },

    serializeData : function () {
      var logger, res;
      if (this.form) {
        logger = new xtiger.util.DOMLogger();
        this.form.serializeData(logger);
        res = logger.dump();
      }
      return res;
    },

    reportCancel : function (event) {
      if (! this.hasBeenSaved) { // trick to avoid cancelling a transaction that has been saved
        $.ajax({
          url : this.cancelUrl,
          data : { transaction : this.transaction },
          type : 'GET',
          async : false
          });
      }
    }
  };

  var sindex = 0, cindex = 0;
  var registry = {}; // Command class registry to instantiates commands
  var editors = {}; //
  var params = {};

  var  _Command = {
    
      configure : function (key, value) {
        params[key] = value;
      },
    
      // Reports error to the user either in a predefined DOM node (jQuery selector) or as an alert
      logError : function (msg, optSel) {
        var log = optSel ? $(optSel) : undefined;
        if (log && (log.length > 0)) {
          log.text(msg);
        } else if (typeof params.logError === "function") {
          params.logError(msg);
        } else {
          alert(msg);
        }
      },

      // Adds a new command factory
      register : function (name, factory, params) {
        var record = { factory : factory };
        if (params) {
          $axel.extend(record, params);
        }
        registry[name] = record;
      },

      getEditor : function (key) {
        return editors[key];
      }
  };

  // Creates a new editor from a DOM node and the path to use with AXEL
  function _createEditor (node, doc, axelPath) {
    var key = $(node).attr('id') || ('untitled' + (sindex++)),
        res = new Editor(key, node, doc, axelPath);
    editors[key] = res;
    return res;
  }

  // Creates a new command from a DOM node
  function _createCommand (node, doc) {
    var type = $(node).attr('data-command'), // e.g. 'save', 'submit'
        key =  $(node).attr('data-target') || ('untitled' + (cindex++)),
        record = registry[type];
    if (record) {
      if (record.check) {
        if ($axel.command.getEditor(key)) { // checks editor existence
            if (node.disabled) { // activates trigger
              node.disabled = false;
            }
            new registry[type].factory(key, node, doc); // command constructor should register to trigger event
        } else {
          node.disabled = true; // unactivates trigger
          $axel.command.logError('Missing or invalid data-target attribute in ' + type + ' command ("' + key + '")');
        }
      } else {
        new registry[type].factory(key, node, doc); // command constructor should register to trigger event
      }
    } else {
      $axel.command.logError('Attempt to create an unkown command "' + type + '"');
    }
  }

  function _installCommands (doc) {
    var axelPath = $('script[data-bundles-path]').attr('data-bundles-path'),
        editors = $('div[data-template]', doc).add('body[data-template="#"]', doc),
        accu = [];

    // FIXME: use micro-format for that or solve load sequence ordering issue (?)
    if (axelPath) { // self-transformed document
      $axel.filter.applyTo({ 'optional' : 'input', 'event' : 'input' });
    }

    // creates editors (div with 'data-template')
    if (editors.length > 0) {
      if (axelPath || params.axelPath) {
        editors.each(
          function (index, elt) {
            accu.push(_createEditor(elt, doc, axelPath || params.axelPath));
          }
        );
      } else {
        $axel.command.logError('Cannot start editing because AXEL library path is unspecified');
      }
    }
    
    // creates commands
    $('*[data-command]', doc).each(
      function (index, elt) {
        _createCommand(elt, doc);
      }
    );
    
    // FIXME: use micro-format for that or solve load sequence ordering issue (?)
    if (axelPath) { // self-transformed document
      $axel.binding.install(document); // FIXME: narrow to installed editors
    }
    return accu;
  }

  // exports module
  $axel.command = _Command;
  $axel.command.install = _installCommands;

  // document ready handler to install commands (self-transformed documents only)
  jQuery(function() { _installCommands(document); });
}($axel));

// file: axel-forms/src/core/binding.js
 /* ***** BEGIN LICENSE BLOCK *****
  *
  * Copyright (C) 2012 S. Sire
  *
  * This file contains files from the AXEL-FORMS extension to the Adaptable XML Editing Library (AXEL)
  * Version @VERSION@
  *
  * AXEL-FORMS is licensed by Oppidoc SARL
  *
  * Web site : http://www.oppidoc.fr, https://bitbucket.org/ssire/axel-forms
  *
  * Contributors(s) : S. Sire
  *
  * ***** END LICENSE BLOCK ***** */

/*****************************************************************************\
|                                                                             |
|  AXEL Binding                                                               |
|                                                                             |
|  manages bindings life cycle (registration)                                 |
|  exposed as $axel.binding                                                   |
|                                                                             |
|*****************************************************************************|
|  Prerequisites: jQuery, AXEL                                                |
|                                                                             |
|  Global functions:                                                          |
|    $axel.binding.register                                                   |
|        registers a binding object                                           |
|                                                                             |
|  TODO:                                                                      |
|  - lazy klass creation ?                                                    |
|                                                                             |
\*****************************************************************************/
(function ($axel) {

  var registry = {};

  /////////////////////////////
  // Default binding Mixin  //
  ////////////////////////////
  var _bindingK = {

    getDocument : function () {
      return this._doc;
    },

    getParam : function (name) {
        return this._param[name] || this._defaults[name];
    },

    getVariable : function () {
        return this._variable;
    }
  };

  /////////////////////////////
  // Optional binding Mixin  //
  ////////////////////////////
  var _bindingErrorK = {

    // Extracts optional errScope and forges errSel selector to locate error display
    _installError : function ( host ) {
      // FIXME: we could check first a binding specific data-:binding-error-scope
      this.errScope = host.attr('data-error-scope') || undefined;
      this.errSel = '[data-' + this.getName() + '-error="' + this.getVariable() + '"]';
    },

    // Either hide or show error message depending on valid
    // anchor is the DOM node to used as the starting point in case of a scoped error
    toggleError : function (valid, anchor) {
      var error, scope, doc = this.getDocument();
      if (! this.errScope) { // search error in full document
        error = $('body ' + this.errSel, doc);
      } else if (anchor) { // search error within scope
        scope = $(anchor, doc).closest(this.errScope);
        error = $(this.errSel, scope.get(0));
      }
      if (error) {
        if (valid) {
          error.hide();
        } else {
          error.show();
        }
      }
      return valid;
    }
  };

  function _createBingingKlass ( name, options, klassdefs ) {
    var klass = new Function();
    klass.prototype = (function (name) {
      var _NAME = name;
      return {
       getName : function () { return _NAME; }
      };
    }(name));

    $axel.extend(klass.prototype, _bindingK); // inherits default binding methods

    // inherits optoinal mixin modules
    if (options && options.error) {
      $axel.extend(klass.prototype, _bindingErrorK);
    }

    // copy life cycle methods
    klass.prototype.onInstall = klassdefs.onInstall;

    // copy other methods
    $axel.extend(klass.prototype, klassdefs.methods, false, true);
    return klass;
  }
  
  // FIXME: internationalize validation error messages
  function _validate (fields, errid, doc, cssrule) {
    var errsel = '#' + errid,
        labsel = cssrule || '.af-label', // selector rule to extract label
        err = [], // required error
        valid = [];  // validation error
      fields.apply(
      function (field) {
        // we consider failure to meet required implies field is valid
        var rsuccess = (field.getParam('required') !== 'true') || field.isModified(), 
            vsuccess = (!rsuccess) || (!field.isValid || field.isValid()), 
            f = $(field.getHandle()),
            label, i;
        if (rsuccess) {
          f.removeClass('af-required');
        }
        if (vsuccess) {
          f.removeClass('af-invalid');
        }
        if (!rsuccess || !vsuccess) {
          label = $(field.getHandle()).parent().children(labsel).text();
          i = label.lastIndexOf(':');
          if (i != -1) {
            label = label.substr(0, i);
          }
          label = $.trim(label);
          if (!rsuccess) {
            f.addClass('af-required');
            err.push(label);
          } else {
            f.addClass('af-invalid');
            valid.push(label);
          }
        }
      }
    );
    $(errsel, doc).html('');
    if (err.length > 0) {
      $(errsel, doc).append(
        '<p>Vous devez remplir les champs suivants : ' + err.join(', ') + '</p>'
      );
    }
    if (valid.length > 0) {
      $(errsel, doc).append(
        '<p>Vous devez corriger les champs suivants : ' + valid.join(', ') + '</p>'
      );
    }
    return (err.length === 0) && (valid.length === 0);
  }
  
  // Extends a primitive editor instance with an isValid function 
  // that executes a validator function (a validator function is a function 
  // returning true or false - usually associated with a binding)
  // Validator functions are chained if one is already present
  function _addValidator (editor, validator) {
    if (editor) {
      if (typeof editor.isValid === "function") {
        editor.isValid.extend(validator);
      } else {
        editor.isValid = function ( func ) { 
            var _chain = [ func ];
            var _valid = function () {
              var i, res = true;
              for (var i = 0; i < _chain.length; i++) {
                res = res && _chain[i](this); // "this" should be the AXEL primitive editor
              }
              return res;
            }
            _valid.extend = function ( func ) {
              _chain.push(func);
            }
            return _valid;
          } (validator);
      }
    } else {
      xtiger.cross.log('error', 'attempt to set a validator function on an undefined editor');
    }
  }

  // Creates and register a new binding class applying optional mixins
  // and declaring parameters
  function _registerBinding ( name, options, parameters, binding ) {
    var defaults = {}, 
        k = _createBingingKlass(name, options, binding);
    $axel.extend(defaults, parameters); // copy default parameters
    registry[name] = {
      name : name,
      options : options,
      defaults : defaults,
      klass : k // FIXME: lazy ?
    };
  }

  // instantiate one binding on a JQuery wrapped host node in a document
  function _installBinding (spec, host, doc ) {
    var k, binding, defaults, cur, param = {}, ok = true;
    var key = host.attr('data-variable'); // mandatory
    if (key) {
      // parses parameters and cancel creation if required parameters are missing
      defaults = spec.defaults;
      for (k in defaults) {
        if (defaults.hasOwnProperty(k)) {
          cur = host.attr('data-' + k);
          if (cur) {
            param[k] = cur;
          } else if (defaults[k] === $axel.binding.REQUIRED) {
            xtiger.cross.log('error', 'Missing attribute "data-' + k + '" to install "' + spec.name + '" binding');
            ok = false;
            break;
          }
        }
      }
      if (ok) {
        binding = new spec.klass();
        binding._doc = doc;
        binding._variable = key;
        binding._defaults = defaults;
        binding._param = param;
        // mixin specific initializations
        if (spec.options && spec.options.error) {
          binding._installError(host);
        }
        // call life cycle method
        binding.onInstall(host); 
        xtiger.cross.log('debug', 'installed binding "' + spec.name + '"');
        return binding;
      }
    } else {
      xtiger.cross.log('error', 'Missing attribute "data-variable" to install "' + spec.name + '" binding');
    }
  }

  // when sliceStart/sliceEnd is defined installs on a slice
  function _installBindings ( doc, sliceStart, sliceEnd ) {
    var cur = sliceStart || doc,
        sel = sliceStart ? '[data-binding]' : 'body [data-binding]'; // body to avoid head section
    xtiger.cross.log('debug', 'installing bindings ' + (sliceStart ? 'slice mode' :  'document mode'));
    do {
      $(sel, cur).each(
        function(index, n) {
          var i, el = $(n),
              names = el.attr('data-binding').split(' ');
          for (i = 0; i < names.length; i++) {
            if (registry[names[i]]) {
              xtiger.cross.log('debug', 'installing binding "' + names[i] + '"');
              _installBinding(registry[names[i]], el, doc);
            } else {
              xtiger.cross.log('error', 'unregistered binding "' + names[i] + '"');
            }
          }
        }
      );
      cur = sliceStart ? cur.nextSibling : undefined;
    } while (cur && (cur !== sliceEnd));
  }

 $axel.binding = $axel.binding || {};
 
 $axel.binding.list = function () {
   var key, accu = [];
   for (key in registry) { accu.push(key); }
   return accu;
 };

 // exports functions
 $axel.binding.register = _registerBinding;
 $axel.binding.install = _installBindings;
 $axel.binding.validate = _validate; 
 $axel.binding.setValidation = _addValidator;
 $axel.binding.REQUIRED = 1; // constant to declare required parameters
}($axel));


// file: axel-forms/src/plugins/choice.js
/**
 * AXEL-FORMS "choice" plugin
 *
 * HTML forms "select/option" element wrapper
 *
 * Synopsis :
 *  - <xt:use types="choice" param="noselect=---" values="one two three"/>
 *
 * TODO :
 *  - insert in keyboard manager focus chain
 *  - factorize code with "select" plugin or merge all into a "list" plugin
 *
 */

(function ($axel) {

  // Plugin static view: span showing current selected option
  var _Generator = function ( aContainer, aXTUse, aDocument ) {
   var viewNode = xtdom.createElement (aDocument, 'select');
   aContainer.appendChild(viewNode);
   return viewNode;
  };

  var _Editor = (function () {

   // Splits string s on every space not preceeded with a backslash "\ "
   // Returns an array
   // FIXME: move to xtiger.util
   function _split ( s ) {
     var res;
     if (s.indexOf("\\ ") === -1) {
       return s.split(' ');
     } else {
       res = s.replace(/\\ /g, "&nbsp;");
       return xtiger.util.array_map(res.split(' '),
          function (e) { return e.replace(/&nbsp;/g, " "); }
        );
     }
   }

   // options is an array of the form [labels, values]
   function createOptions ( that, values, labels ) {
     var i, o, t, handle = that.getHandle(),
         doc = that.getDocument();
     for (i = 0; i < values.length; i++) {
       o = xtdom.createElement(doc, 'option');
       t = xtdom.createTextNode(doc, labels[i]);
       xtdom.setAttribute(o, 'value', values[i]);
       o.appendChild(t);
       handle.appendChild(o);
     }
   }

   return {

     ////////////////////////
     // Life cycle methods //
     ////////////////////////

     onInit : function ( aDefaultData, anOptionAttr, aRepeater ) {
       var handle, values = this.getParam('values');
       if (this.getParam('hasClass')) {
         xtdom.addClassName(this._handle, this.getParam('hasClass'));
       }
       // builds options if not cloned from a repeater
       if (! aRepeater) {
          createOptions(this, this.getParam('values'), this.getParam('i18n'));
       }
       this._setData(aDefaultData);
     },

     onAwake : function () {
       var _this = this;
       xtdom.addEventListener(this._handle, 'change',
        function (ev) {
          var rank = xtdom.getSelectedOpt(_this.getHandle()),
              values = _this.getParam('values');
          _this.update(values[rank]);
        }, true);
     },

     onLoad : function (aPoint, aDataSrc) {
       var value, fallback;
       if (aPoint !== -1) {
         value = aDataSrc.getDataFor(aPoint);
         fallback = this.getDefaultData();
         if (value) {
           this._setData(value);
         } else {
           this._setData(fallback);
         }
         this.set(false);
         this.setModified(value !==  fallback);
       } else {
         this.clear(false);
       }
     },

     onSave : function (aLogger) {
       if ((!this.isOptional()) || this.isSet()) {
         if (this._data !== "---") { // FIXME: getParam("noselect")
           aLogger.write(this._data);
         }
       } else {
         aLogger.discardNodeIfEmpty();
       }
     },

     ////////////////////////////////
     // Overwritten plugin methods //
     ////////////////////////////////

     api : {

       // FIXME: first part is copied from Plugin original method,
       // an alternative is to use derivation and to call parent's method
       _parseFromTemplate : function (aXTNode) {
         var tmp, defval;
         this._param = {};
         xtiger.util.decodeParameters(aXTNode.getAttribute('param'), this._param);
         defval = xtdom.extractDefaultContentXT(aXTNode); // value space (not i18n space)
         tmp = aXTNode.getAttribute('option');
         this._option = tmp ? tmp.toLowerCase() : null;
         // completes the parameter set
         var values = aXTNode.getAttribute('values'),
             i18n = aXTNode.getAttribute('i18n'),
             _values = values ? _split(values) : ['undefined'],
             _i18n = i18n ? _split(i18n) : undefined;
         if (! defval) { // creates default selection if undefined
           _values.splice(0,0,"---"); // FIXME: getParam("noselect")
           if (_i18n) {
             _i18n.splice(0,0,"---");
           }
           defval = "---";
         }
         this._param.values = _values; // FIXME: validate both are same lenght
         this._param.i18n = _i18n || _values;
         this._content = defval;
       },

       isFocusable : function () {
         return true;
       }

     },

     /////////////////////////////
     // Specific plugin methods //
     /////////////////////////////

     methods : {

       // FIXME: modifier l'option si ce n'est pas la bonne actuellement ?
       _setData : function ( value, withoutSideEffect ) {
         var i, values = this.getParam('values');
         this._data =  value;
         if (! withoutSideEffect) {
           for (i = 0; i < values.length; i++) {
             if (value === values[i]) {
               xtdom.setSelectedOpt (this.getHandle(), i);
             }
           }
         }
       },

       dump : function () {
         return this._data;
       },

       // aData is the universal value and not the localized one
       update : function (aData) {
         this._setData(aData, true);
         // updates isModified, a priori this is meaningful only in case of an empty default selection
         this.setModified (aData !== this.getDefaultData());
         this.set(true);
       },

       clear : function (doPropagate) {
         this._setData(this.getDefaultData());
         if (this.isOptional()) {
           this.unset(doPropagate);
         }
       }
     }
   };
  }());

  $axel.plugin.register(
    'choice',
    { filterable: true, optional: true },
    {
     choice : 'value'  // alternative is 'display'
    },
    _Generator,
    _Editor
  );
}($axel));

// file: axel-forms/src/plugins/input.js
/**
 * Class InputFactory
 *
 * HTML forms "input" element wrapper
 * 
 * Currently handles a subset of input types (see Synopsis)
 *
 * Synopsis :
 *  - <xt:use types="input" param="type=(text|password|radio|checkbox)[;placeholder=string]">default value</xt:use>
 *  - placeholder parameter is only for a 'text' input
 *
 * TODO :
 *  - load empty values (undefined)
 *  - detect if HTML5 and use placeholder for 'text' input hint instead of default content
 *
 */
(function ($axel) {

  var _Generator = function ( aContainer, aXTUse, aDocument ) {
    var _handle = xtdom.createElement(aDocument, 'input'),
        pstr = aXTUse.getAttribute('param'); // IE < 9 does not render 'radio' or 'checkbox' when set afterwards
    if (pstr) {
      if (pstr.indexOf("type=radio") !== -1) {
        xtdom.setAttribute(_handle, 'type', 'radio');
      } else if (pstr.indexOf("type=checkbox") !== -1) {
        xtdom.setAttribute(_handle, 'type', 'checkbox');
      }
    }
    aContainer.appendChild(_handle);
    return _handle;
  };

  var _CACHE= {}; // TODO: define and subscribe to load_begin / load_end events to clear it
  var _CLOCK= {}; // Trick to generate unique names for radio button groups

  // Internal class to manage an HTML input with a 'text' or 'password' type
  var _KeyboardField = function (editor, aType, aData) {
    var h = editor.getHandle();
    this._editor = editor;
    this.isEditable = !editor.getParam('noedit');
    this.defaultData = aData || '';
    xtdom.setAttribute(h, 'type', aType);
    h.value = this.defaultData;
    // FIXME: placeholder if HTML5 (?)
  };

  var _encache = function _encache(name, value) {
    // xtiger.cross.log('debug', 'encache of ' + name + '=' + value);
    if (!_CACHE[name]) {
      _CACHE[name] = {};
    }
    _CACHE[name][value] = true;
  };

  var _decache = function _decache (name, value) {
    // xtiger.cross.log('debug', 'decache of ' + name + '=' + value);
    if (_CACHE[name] && _CACHE[name][value]) {
      delete _CACHE[name][value];
      // xtiger.cross.log('debug', 'decache success of ' + name + '=' + value);
      return true;
    }
    // xtiger.cross.log('debug', 'decache failure of ' + name + '=' + value);
    return false;
  };
  
  var _getClockCount = function (name, card) {
    var tmp = parseInt(card),
        num = ((tmp === 0) || (isNaN(tmp))) ? 1 : tmp; // FIXME: could be stored once into param
    if (_CLOCK[name] === undefined) {
      _CLOCK[name] = 0;
    } else {
      _CLOCK[name] += 1;
    }
    return Math.floor(_CLOCK[name] / num);
  };

  _KeyboardField.prototype = {

    // FIXME: s'abonner aussi sur focus (navigation au clavier avec accessibilité ?)
    awake : function () {
      var h = this._editor.getHandle();
      var _this = this;
      if (this.isEditable) {
        xtdom.addEventListener(h, 'focus',
          function(ev) {
            if (!_this.isEditing()) {
              _this.startEditing(ev); 
            }
            xtdom.stopPropagation(ev);
            xtdom.preventDefault(ev);
          }, true);
        xtdom.addEventListener(h, 'click',
          function(ev) {
            if (!_this.isEditing()) {
              _this.startEditing(ev); 
            }
            xtdom.stopPropagation(ev);
            xtdom.preventDefault(ev);
          }, true);
        xtdom.addEventListener(h, 'mouseup', // needed on Safari to prevent unselection
          function(ev) {
            xtdom.stopPropagation(ev);
            xtdom.preventDefault(ev);
          }, true);
        xtdom.addEventListener(h, 'blur',
          function(ev) { 
            if (_this.isEditing()) {
              _this.stopEditing(false, true);
            }
          }, true);
      }
    },

    isFocusable : function () {
      return (this.isEditable && ((!this._editor.isOptional()) || this._editor.isSet())); 
    },
  
    // AXEL keyboard API (called from Keyboard manager instance) 
    isEditing : function () {
      return this._isEditing;
    },

    // AXEL keyboard API (called from Keyboard manager instance)      
    doKeyDown : function (ev) { 
    },

    // AXEL keyboard API (called from Keyboard manager instance) 
    doKeyUp : function (ev) { 
    },  

    // AXEL tab group manager API
    // Gives the focus to *this* instance. Called by the tab navigation manager.
    focus : function () {
      this._editor.getHandle().focus();
      this.startEditing();
    },

    // AXEL tab group manager API
    // Takes the focus away from *this* instance. Called by the tab navigation manager.
    unfocus : function () {
      this.stopEditing();
    },

    load : function (aPoint, aDataSrc) {
      var value, fallback;
      if (aPoint !== -1) {
        value = aDataSrc.getDataFor(aPoint);
        fallback = this._editor.getDefaultData();
        this._editor.getHandle().value = value || fallback || '';
        this._editor.setModified(value !==  fallback);
        this._editor.set(false);
      } else {
          this._editor.clear(false);
      }
    },

    save : function (aLogger) {
      var val = this._editor.getHandle().value;
      if (val) {
        aLogger.write(val);
      }
    },

    // Starts an edition process on *this* instance's device.
    startEditing : function (aEvent) {
      var h, kbd = xtiger.session(this._editor.getDocument()).load('keyboard');
      if (! this._isEditing) {
        h = this._editor.getHandle();
        this._legacy = h.value;
        this._isEditing = true;
        // registers to keyboard events
        this.kbdHandlers = kbd.register(this, h);
        kbd.grab(this, this._editor); // this._editor for Tab group manager to work
        if (!this._editor.isModified()) {
          xtdom.focusAndSelect(h);
        }
      }
    },

    // Stops the ongoing edition process
    stopEditing : function (isCancel, isBlur) {
      var h = this._editor.getHandle();
      var kbd = xtiger.session(this._editor.getDocument()).load('keyboard');
      if (this._isEditing) {
        this._isEditing = false; // do it first to prevent any potential blur handle callback
        kbd.unregister(this, this.kbdHandlers, h);
        kbd.release(this, this._editor);
        if (!isCancel) {
          // this.update(h.value);
          this._editor.update(h.value);
        }
        if ((! isBlur) && (h.blur)) {
          h.blur();
        }
      }
    },

    // Called by Keyboard manager (Esc key)
    cancelEditing : function () {
      this._editor.getHandle().value = this._legacy;
      this.stopEditing();
    },

    clear : function () {
      this._editor.getHandle().value = this.defaultData;
    },

    // Updates this model with the given data.
    // If this instance is optional and "unset", autocheck it.
    // FIXME: call editor.update() method for filtering ? (implies to reestablish getData() and getDefaultData()) ?
    update : function (aData) {
      // 1. no change
      if (aData === this._legacy) { 
        return;
      }
      // 2. normalizes text (empty text is set to _defaultData)
      if (aData.search(/\S/) === -1 || (aData === this._defaultData)) {
        this._editor.clear(true);
      } else {
        // 3. notifies data was updated
        this._editor.setModified(aData !== this.defaultData);
        this._editor.set(true);
      }
    }

  };

  // Internal class to manage an HTML input with a 'radio' or 'checkbox' type
  // cardinality is required for radio group when ?
  var _SelectField = function (editor, aType, aStamp) {
    var h = editor.getHandle(), 
        name = editor.getParam('name'),
        card = editor.getParam('cardinality');
    this._editor = editor;
    this._type = aType;
    // xtdom.setAttribute(h, 'type', aType); (done in Generator because of IE < 9)
    if (name || (aType === 'radio')) {
      if (card) {
        aStamp = _getClockCount(name || 'void', card).toString(); // there should be a name
      }
      name = (name || '').concat(aStamp || '');
      xtdom.setAttribute(h, 'name', name);
      // xtiger.cross.log('debug', 'Created input type ' + aType + ' name=' + name);
    }
    if (editor.getParam('checked') === 'true') {
      xtdom.setAttribute(h, 'checked', true); // FIXME: does not work ?
    }
    // FIXME: transpose defaultData (checked attribute ?)
  };

  _SelectField.prototype = {

    awake : function () {
      // places an update call only for event filtering
      var h = this._editor.getHandle();
      var _this = this;
      xtdom.addEventListener(h, 'click',
        function(ev) {
          if (_this._editor.getHandle().checked) {
            _this._editor.update(_this._editor.getParam('value'));
          } else { 
            _this._editor.update('');
          }
        }, true);
    },

    isFocusable : function () {
      return false;
    },

    load : function (aPoint, aDataSrc) {
      var found, value, ischecked = false;
      value = this._editor.getParam('value');
      if (-1 !== aPoint) { 
        found = aDataSrc.getDataFor(aPoint);
        ischecked = (found === value);
        if (!ischecked) { // second chance : cache lookup
          name = this._editor.getParam('name');
          if (name) {
            ischecked = _decache(name, value);
            _encache(name, found);
          } // otherwise anonymous checkbox with unique XML tag
        }
        if (ischecked) { // checked
          if (! this._editor.getHandle().checked) {
            this._editor.getHandle().checked = true;
            this._editor.set(false);
          }
        } else { // no checked
          this._editor.clear(false);
        }
      } else { // second chance
        // xtiger.cross.log('debug', 'aPoint is -1');
        name = this._editor.getParam('name');
        if (name) {
          ischecked = _decache(name, value);
        } // otherwise anonymous checkbox with unique XML tag
        if (ischecked) { // checked
          if (! this._editor.getHandle().checked) {
            this._editor.getHandle().checked = true;
            this._editor.set(false);
          }
        } else { // no checked
          this._editor.clear(false);
        }
      }
      // FIXME: isModified is not accurate for this type of field since we do not track update
    },

    // FIXME: how to handle serialization to an xt:attribute
    save : function (aLogger) {
      // TODO: serialize checkbox without value with no content or make value mandatory
      // si on accepte contenu vide pb est de faire le load, il faudra tester sur le nom de la balise (?)
      if (this._editor.getHandle().checked) {
        aLogger.write(this._editor.getParam('value'));
      } else { // same as option="unset"
        aLogger.discardNodeIfEmpty();
      }
    },
  
    update : function (aData) {
      // nope
    },
  
    clear : function () {
      this._editor.getHandle().checked = false;
    }
  
  };
  
  // you may add a closure to define private properties / methods
  var _Editor = {
    
    ////////////////////////
    // Life cycle methods //
    ////////////////////////

    onInit : function ( aDefaultData, anOptionAttr, aRepeater ) {
      var type, data;
      // create delegate
      type = this.getParam('type');
      if ((type === 'text') || (type === 'password')) {
        this._delegate = new _KeyboardField(this, type, aDefaultData);
      } else if ((type === 'radio') || (type === 'checkbox')) {
        this._delegate = new _SelectField(this, type, aRepeater ? aRepeater.getClockCount() : undefined);
      } else {
        xtdom.addClassName(this._handle, 'axel-generator-error');
        xtdom.setAttribute(this._handle, 'readonly', '1');
        xtdom.setAttribute(this._handle, 'value', 'ERROR: type "' + type + '" not recognized by plugin "input"');
        alert('Form generation failed : fatal error in "input" plugin declaration')
      }
      if (this.getParam('hasClass')) {
        xtdom.addClassName(this._handle, this.getParam('hasClass'));
      }
      // TBD: id attribute on handle (?)
    },

    onAwake : function () {
      this._delegate.awake();
    },
    
    onLoad : function (aPoint, aDataSrc) {
      this._delegate.load(aPoint, aDataSrc);
    },

    onSave : function (aLogger) {
      if (this.isOptional() && !this.isSet()) {
        aLogger.discardNodeIfEmpty();
      } else {
        this._delegate.save(aLogger);
      }
    },
    
    ////////////////////////////////
    // Overwritten plugin methods //
    ////////////////////////////////
    api : {

      isFocusable : function () {
        return this._delegate.isFocusable();
      },

      focus : function () {
        if (this._delegate.focus) {
          this._delegate.focus();
        }
      },

      unfocus : function () {
        if (this._delegate.focus) {
          this._delegate.unfocus();
        }
      }
    },
    
    /////////////////////////////
    // Specific plugin methods //
    /////////////////////////////
    methods : {
      
      dump : function () {
        return this._delegate.dump();
      },

      update : function (aData) {
        this._delegate.update(aData);
      },

      // Clears the model and sets its data to the default data.
      // Unsets it if it is optional and propagates the new state if asked to.     
      clear : function (doPropagate) {
        this._delegate.clear();
        this.setModified(false);
        if (this.isOptional() && this.isSet()) {
          this.unset(doPropagate);
        }
      },

      // Overwrite 'optional' mixin method
      set : function(doPropagate) {
        // propagates state change in case some repeat ancestors are unset at that moment
        if (doPropagate) {
          if (!this.getParam('noedit')) {
            xtiger.editor.Repeat.autoSelectRepeatIter(this.getHandle());
          }
          xtdom.removeClassName(this._handle, 'axel-repeat-unset'); 
          // fix if *this* model is "placed" and the handle is outside the DOM at the moment
        }
        if (! this._isOptionSet) {
          this._isOptionSet = true;
          if (this._isOptional) {
            this._handle.disabled = false;
            this._optCheckBox.checked = true;
          }
        }
      },

      // Overwrite 'optional' mixin method
      unset : function (doPropagate) {
        if (this._isOptionSet) {
          this._isOptionSet = false;
          if (this._isOptional) {
            this._handle.disabled = true;
            this._optCheckBox.checked = false;
          }
        }
      }
    }
  }; 

  $axel.plugin.register(
    'input', 
    { filterable: true, optional: true },
    { 
      type : 'text'
      // checked : 'false'
    },
    _Generator,
    _Editor
  );
}($axel));

// file: axel-forms/src/bindings/blacklist.js
/*****************************************************************************\
|                                                                             |
|  AXEL 'blacklist' binding                                                   |
|                                                                             |
|  Implements list of values to avoid                                         |
|  Applies to AXEL 'input' plugin                                             |
|                                                                             |
|*****************************************************************************|
|  Prerequisites: jQuery, AXEL, AXEL-FORMS                                    |
|                                                                             |
\*****************************************************************************/
(function ($axel) {

  var _Blacklist = {

    onInstall : function ( host ) {
      this.terms = this.getParam('blacklist').split(' ');
      this.editor = $axel(host);
      host.bind('axel-update', $.proxy(this.filter, this));
      $axel.binding.setValidation(this.editor.get(0), $.proxy(this.filter, this));
    },

    methods : {

      filter : function  () {
        var i, cur = this.editor.text(), valid = true;
        for (i = 0; i < this.terms.length; i++) {
          if (cur === this.terms[i]) {
            valid = false;
            break;
          }
        }
        return this.toggleError(valid, this.editor.get(0).getHandle(true));
      }
    }
  };

  $axel.binding.register('blacklist',
    { error : true  }, // options
    { 'blacklist' : $axel.binding.REQUIRED }, // parameters
    _Blacklist
  );

}($axel));

// file: axel-forms/src/bindings/clear.js
/*****************************************************************************\
|                                                                             |
|  AXEL 'select' binding                                                      |
|                                                                             |
|  Turns checked property of target editors to true (iff target is enabled)   |
|  Applies to AXEL 'input' plugin of 'checkbox' type                          |
|                                                                             |
|*****************************************************************************|
|  Prerequisites: jQuery, AXEL, AXEL-FORMS                                    |
|                                                                             |
|  TODO: find a way to track duplicate / paste / cut / remove / load events   |
|        to recompute the controls state to hide / display the trigger        |
|                                                                             |
\*****************************************************************************/
(function ($axel) {

  var _Clear = {

    onInstall : function ( host ) {
      var trigger = $('[data-clear="' + this.getVariable() + '"]', this.getDocument());
      this.editors = $axel(host);
      this.ui = trigger;
      trigger.bind('click', $.proxy(this, 'execute'));
      host.bind('axel-update', $.proxy(this, 'update'));
      host.bind('axel-select-all', $.proxy(this, 'update'));
      trigger.hide();
    },

    methods : {
      execute : function  () {
        this.editors.clear(false);
        this.ui.hide();
      },
      update : function  () {
        var content = this.editors.text();
        if (content.length > 0) {
          this.ui.show();
        } else {
          this.ui.hide();
        }
      }
    }
  };

  $axel.binding.register('clear',
    null, // options
    null, // parameters
    _Clear
  );

}($axel));

// file: axel-forms/src/bindings/condition.js
/*****************************************************************************\
|                                                                             |
|  AXEL 'condition' binding                                                   |
|                                                                             |
|  Implements data-avoid-{variable} to disable fields on given data values    |
|  Applies to AXEL 'input' plugin                                             |
|                                                                             |
|*****************************************************************************|
|  Prerequisites: jQuery, AXEL, AXEL-FORMS                                    |
|                                                                             |
\*****************************************************************************/
(function ($axel) {

  var _Condition = {

    onInstall : function ( host ) {
      this.avoidstr = 'data-avoid-' + this.getVariable();
      this.editor = $axel(host);
      host.bind('axel-update', $.proxy(this.updateConditionals, this));
    },

    methods : {

      updateConditionals : function  (ev, editor) {
        var curval = this.editor.text();
        var fullset = $('body [' + this.avoidstr + ']', this.getDocument());
        var onset = fullset.not('[' + this.avoidstr + '*=' + curval + ']');
        var offset = fullset.filter('[' + this.avoidstr + '*=' + curval + ']');
        onset.find('input').attr('disabled', null);
        onset.css('color', 'inherit');
        offset.find('input').attr('disabled', true);
        offset.css('color', 'lightgray');
      }
    }
  };

  $axel.binding.register('condition',
    null, // no options
    null, // no parameters on host
    _Condition);

}($axel));

// file: axel-forms/src/bindings/interval.js
/*****************************************************************************\
|                                                                             |
|  AXEL 'interval' binding                                                    |
|                                                                             |
|  Implements data-min-date, data-max-date to define an interval              |
|  Applies to AXEL 'date' filter                                              |
|                                                                             |
|*****************************************************************************|
|  Prerequisites: jQuery, AXEL, AXEL-FORMS                                    |
|                                                                             |
\*****************************************************************************/
(function ($axel) {

  var today;

  function parseDate(date, defaults) {
    try {
      return date ? $.datepicker.formatDate('dd/mm/yy',$.datepicker.parseDate('yy-mm-dd', date)) : defaults;
    }
    catch (e) {
      return defaults;
    }
  }

  var _Interval = {

    onInstall : function (host ) {
      var key = this.getVariable(),
          jmin = $('[data-min-date=' + key + ']', host.get(0)),
          jmax = $('[data-max-date=' + key + ']', host.get(0));
      today = $.datepicker.formatDate('dd/mm/yy', new Date()); // FIXME: factorize
      this.min = $axel(jmin.get(0), true);
      this.max = $axel(jmax.get(0), true);
      this.min.configure('beforeShow', $.proxy(this.beforeShowMinDate, this));
      this.max.configure('beforeShow', $.proxy(this.beforeShowMaxDate, this));
      this.max.configure('maxDate', today); // FIXME: move to 'date' date_maxDate=today param
      jmin.bind('axel-update', $.proxy(this.minDateChanged, this));
      jmax.bind('axel-update', $.proxy(this.maxDateChanged, this));
    },

    methods : {

      beforeShowMinDate : function ( input, picker ) {
        return { 'maxDate' : parseDate(this.max.text(), today) };
      },

      beforeShowMaxDate : function ( input, picker ) {
        return { 'minDate' : parseDate(this.min.text(), null) };
      },

      minDateChanged : function ( ev, editor ) {
        var cur, max = today;
        try { cur = $.datepicker.parseDate('dd/mm/yy', editor.getData()); } catch (e1) {}
        try { max = $.datepicker.parseDate('dd/mm/yy', this.max.getData()); } catch (e2) {}
        if (cur && (cur > max)) {
          this.max._setData(editor.getData());
        }
      },

      maxDateChanged : function ( ev, editor ) {
        var cur, min = today;
        try { cur = $.datepicker.parseDate('dd/mm/yy', editor.getData()); } catch (e1) {}
        try { min = $.datepicker.parseDate('dd/mm/yy', this.min.getData()); } catch (e2) {}
        if (cur && (cur < min)) {
          this.min._setData(editor.getData());
        }
      }
    }
  };

  $axel.binding.register('interval',
    null, // no options
    null, // no parameters on host
    _Interval
  );

}($axel));

// file: axel-forms/src/bindings/regexp.js
/*****************************************************************************\
|                                                                             |
|  AXEL 'condition' binding                                                   |
|                                                                             |
|  Implements data-avoid-{variable} to disable fields on given data values    |
|  Applies to AXEL 'input' plugin                                             |
|                                                                             |
|*****************************************************************************|
|  Prerequisites: jQuery, AXEL, AXEL-FORMS                                    |
|                                                                             |
\*****************************************************************************/
(function ($axel) {

  var _Regexp = {

    onInstall : function ( host ) {
      this.re = new RegExp(this.getParam('regexp') || '');
      this.editor = $axel(host);
      host.bind('axel-update', $.proxy(this.checkRegexp, this));
      $axel.binding.setValidation(this.editor.get(0), $.proxy(this.checkRegexp, this));
    },

    methods : {

      checkRegexp : function  () {
        var valid = this.re.test(this.editor.text());
        return this.toggleError(valid, this.editor.get(0).getHandle(true));
      }
    }
  };

  $axel.binding.register('regexp',
    { error : true  }, // options
    { 'regexp' : $axel.binding.REQUIRED }, // parameters
    _Regexp
  );

}($axel));




// file: axel-forms/src/bindings/required.js
/*****************************************************************************\
|                                                                             |
|  AXEL 'required' binding                                                    |
|                                                                             |
|  Makes a group of radio buttons or checkboxes required.                     |
|                                                                             |
|  Applies to a group of children AXEL 'input' plugins of type 'radio'        |
|  or 'checkbox'                                                              |
|                                                                             |
|*****************************************************************************|
|  Prerequisites: jQuery, AXEL, AXEL-FORMS                                    |
|                                                                             |
|  WARNING: experimental and tricky !                                         |
|  The binding registers itself on the DOM tree as a fake primitive editor    |
\*****************************************************************************/
(function ($axel) {

  var _Required = {

    onInstall : function ( host ) {
      this.editors = $axel(host);
      this.handle = host.get(0);
      if (this.handle.xttPrimitiveEditor) {
        xtiger.cross.log('error','Failed attempt to attach a "required" binding directly onto a primitive editor');
      } else {
        this.handle.xttPrimitiveEditor = this;
      }
    },

    methods : {

      isModified : function  () {
        var res = (this.editors.text() !== '')
        return res;
      },
      
      isFocusable : function () {
        var relay = this.editors.get(0);
        return relay ? relay.isFocusable() : false;
      },
      
      focus : function () {
        var relay = this.editors.get(0);
        if (relay) {
          this.editors.get(0).focus()
        }
      },

      unfocus : function () {
        // should never be called
      },
      
      // DEPRECATED
      can : function (aFunction) {
        return false;
      },
      
      // required to display field name in validation
      getHandle : function () {
        return this.handle;
      },
      
      onInit : function ( aDefaultData, anOptionAttr, aRepeater ) {
      },
      
      onAwake : function () {
      },

      // FIXME: to be replaced by onSave
      load : function (aPoint, aDataSrc) {
      },
      
      // FIXME: to be replaced by onSave
      save : function (aLogger) {
      }      
    }
  };

  $axel.binding.register('required',
    { error : true  }, // options
    { 'required' : 'true' }, // parameters
    _Required
  );

}($axel));

// file: axel-forms/src/bindings/select.js
/*****************************************************************************\
|                                                                             |
|  AXEL 'select' binding                                                      |
|                                                                             |
|  Turns checked property of target editors to true (iff target is enabled)   |
|  Applies to AXEL 'input' plugin with type to checkbox                       |
|                                                                             |
|*****************************************************************************|
|  Prerequisites: jQuery, AXEL, AXEL-FORMS                                    |
|                                                                             |
\*****************************************************************************/
(function ($axel) {

  var _Select = {

    onInstall : function ( host ) {
      this.host = host;
      this.editors = $axel(host);
      $('[data-select="' + this.getVariable() + '"]', this.getDocument()).bind('click', $.proxy(this, 'execute'));
    },

    methods : {
      execute : function  () {
        // FIXME: we should use the editor's API to change it's state instead
        this.editors.apply(function(n){ if (! n.disabled) { n.checked = true}}, true);
        $(this.host).triggerHandler('axel-select-all', [this]);
      }
    }
  };

  $axel.binding.register('select',
    null, // options
    null, // parameters
    _Select
  );

}($axel));

// file: axel-forms/src/bindings/unique.js
/*****************************************************************************\
|                                                                             |
|  AXEL 'unique' binding                                                      |
|                                                                             |
|  Checks that each field in a set has a unique value                         |
|                                                                             |
|*****************************************************************************|
|  Prerequisites: jQuery, AXEL, AXEL-FORMS                                    |
|                                                                             |
|  Limitations:                                                               |
|  Can be used only once (only one set) per document at that time             |
|                                                                             |
|  TODO:                                                                      |
|  data-unique-scope                                                          |
|  recompute set state on ALL life cycle events                               |
|                                                                             |
\*****************************************************************************/
(function ($axel) {

  var _Unique = {

    onInstall : function ( host ) {
      this.editor = $axel(host);
      host.get(0).axel_binding_unique = this;
      host.bind('axel-update', $.proxy(this.checkSet, this));
      $axel.binding.setValidation(this.editor.get(0), $.proxy(this.checkOne, this));
      this.checkOne(); // just check this one to avoid too much iterations when loading XML
    },

    methods : {
      // updates the uniqueness constraint on every element into the set
      // the alternative would be to have the legacy value in 'axel-update' callback
      checkSet : function  (ev, data) {
        var i, j, curval, sum,
        set = $('body [data-binding~="unique"]', this.getDocument()).filter(function() { return $(this).is(':visible')}),
        editors = $axel(set),
        vals = editors.values(),
        max = editors.length(),
        inerror = new Array(max);
        for (i = 0; i < max; i++) {
          if (inerror[i]) { // small optimization
            continue;
          }
          sum = 0;
          curval = vals[i];
          for (j = i + 1; j < max; j++) {
            if (!inerror[j] && (vals[j] === curval)) {
              inerror[i] = inerror[j] = true;
            }
          }
        }
        for (i = 0; i < max; i++) { // applies result
          try {
            set.get(i).axel_binding_unique.toggleError(!inerror[i], set.get(i));
          } catch (e) { }
        }
      },
      checkOne : function  (ev, data) {
        var set = $('body [data-binding~="unique"]', this.getDocument()).filter(function() { return $(this).is(':visible')}),
            editors = $axel(set),
            self = this.editor.get(0),
            val = this.editor.text(),
            vals = editors.values(),
            valid = true, i;
        for (i = 0; i < vals.length; i++) {
          if ((vals[i] === val) && (editors.get(i) !== self)) {
            try {
              set.get(i).axel_binding_unique.toggleError(false, set.get(i));
            } catch (e) { }
            valid = false;
            break;
          }
        }
        return this.toggleError(valid, this.editor.get(0).getHandle(true));
      }
    }
  };

  $axel.binding.register('unique',
    { error : true }, // uses optional mixin module error
    null, // parameters - TBD: unique-scope
    _Unique
  );

}($axel));

// file: axel-forms/src/commands/dump.js
/*****************************************************************************\
|                                                                             |
|  'dump' command object                                                      |
|                                                                             |
|  Opens a popup window and dump the target editor's content into it          |
|                                                                             |
|*****************************************************************************|
|                                                                             |
|  Required attributes :                                                      |
|  - data-target : id of the editor's container                               |
|                                                                             |
\*****************************************************************************/
(function () {

  function openWin ( name, w, h ) {
    var params = "width=" + w + ",height=" + h + ",status=yes,resizable=yes,scrollbars=yes,title=" + name,
        win;
    if (xtiger.cross.UA.IE) {
      win = window.open('about:blank');
    } else {
      win = window.open(null, name, params);
    }
    return win;
  }

  function transcode ( text ) {
    var filter1 = text.replace(/</g, '&lt;');
    var filter2 = filter1.replace(/\n/g, '<br/>');
    var filter3 = filter2.replace(/ /g, '&nbsp;');
    return filter3;
  }

  function DumpCommand ( identifier, node ) {
    this.key = identifier; /* data-target */
    $(node).bind('click', $.proxy(this, 'execute'));
    xtiger.cross.log('debug', 'installing dump command');
  }

  DumpCommand.prototype = {
    execute : function (event) {
      var editor = $axel.command.getEditor(this.key),
          data, buffer, doc;
      if (editor) {
        prolog = "<?xml version=\"1.0\"?>\n"; // encoding="UTF-8" ?
        data = editor.serializeData();
        // if (stylesheet) {
        //   buffer += '<?xml-stylesheet type="text/xml" href="' + stylesheet + '"?>\n';
        // }
        // if (template) {
        //   buffer += '<?xtiger template="' + template + '" version="1.0" ?>\n';
        // }
        doc = openWin('XML', 800, 600).document;
        doc.open();
        doc.writeln(transcode(prolog));
        doc.writeln(transcode(data));
        doc.close();
      }
    }
  };

  $axel.command.register('dump', DumpCommand, { check : true });
}());



// file: axel-forms/src/commands/preview.js
/*****************************************************************************\
|                                                                             |
|  'preview' command object                                                   |
|                                                                             |
|*****************************************************************************|
|                                                                             |
|  Required attributes :                                                      |
|  - none : currently the command is targeted at all the editors through      |
|    the body tag                                                             |
|                                                                             |
\*****************************************************************************/
(function () {  
  function PreviewCommand ( identifier, node ) {
    var spec = $(node);
    this.label = {
      'preview' : spec.attr('data-preview-label') || spec.text(),
      'edit' : spec.attr('data-edit-label') || 'Edit'
    };
    spec.bind('click', $.proxy(this, 'execute'));
  }
  
  PreviewCommand.prototype = {
    execute : function (event) {
      var body = $('body'),
          gotoPreview = ! body.hasClass('preview');
      $(event.target).text(this.label[gotoPreview ? 'edit' : 'preview']);
      body.toggleClass('preview', gotoPreview);
    }
  };
  
  $axel.command.register('preview', PreviewCommand);
}());
// file: axel-forms/src/commands/reset.js
/*****************************************************************************\
|                                                                             |
|  'reset' command object                                                     |
|                                                                             |
|*****************************************************************************|
|                                                                             |
|  Required attributes :                                                      |
|  - data-target : id of the editor's container                               |
|                                                                             |
\*****************************************************************************/

// TODO :
// currently this does not work if the data-target editor has been generated
// from the document itself (i.e. data-template="#")

(function () {
  
  function ResetCommand ( identifier, node ) {
    this.key = identifier; /* data-target */
    $(node).bind('click', $.proxy(this, 'execute'));
  }
  
  ResetCommand.prototype = {
    execute : function (event) {
      var editor = $axel.command.getEditor(this.key);
      if (editor) {
        editor.reset();
      }
    }
  };
  
  $axel.command.register('reset', ResetCommand, { check : true });
}());
// file: axel-forms/src/commands/save.js
/*****************************************************************************\
|                                                                             |
|  'save' command object (XML submission with Ajax a form)                    |
|                                                                             |
|*****************************************************************************|
|                                                                             |
|  Required attributes :                                                      |
|  - data-target : id of the editor's container                               |
|                                                                             |
|  Optional attributes :                                                      |
|  - data-validation-output (on the target editor): identifier of a target    |
|    element to use as a container for showing validation error messages,     |
|    the presence of this attributes causes validation                        |
|                                                                             |
\*****************************************************************************/

// TODO
// - customize server error decoding for Orbeon 3.8, eXist-DB, etc.

(function () {

  function SaveCommand ( identifier, node, doc ) {
    this.doc = doc || document;
    this.spec = $(node);
    this.key = identifier;
    this.spec.bind('click', $.proxy(this, 'execute'));
  }

  SaveCommand.prototype = (function () {

    function isResponseAnOppidumError (xhr) {
      return $('error > message', xhr.responseXML).size() > 0;
    }

    function getOppidumErrorMsg (xhr) {
      var text = $('error > message', xhr.responseXML).text();
      return text || xhr.status;
    }
    
    function doSwap () {
      this.swap.remove();
      this.fragment.show();
    }

    function doReset () {
      var editor = $axel.command.getEditor(this.key);
      if (editor) {
        editor.reset();
        this.swap.remove();
        this.fragment.show();
      } else {
        $axel.command.logError('Cannot find the document editor to reset', this.errTarget);
      }
    }

    // Tries to extract more info from a server error. Returns a basic error message
    // if it fails, otherwise returns an improved message
    // Compatible with eXist 1.4.x server error format
    function getExistErrorMsg (xhr) {
      var text = xhr.responseText, status = xhr.status;
      var msg = 'Error ! Result code : ' + status;
      var details = "";
      var m = text.match('<title>(.*)</title>','m');
      if (m) {
        details = '\n' + m[1];
      }
      m = text.match('<h2>(.*)</h2>','m');
      if (m) {
        details = details + '\n' + m[1];
      } else if ($('div.message', xhr.responseXML).size() > 0) {
        details = details + '\n' + $('div.message', xhr.responseXML).get(0).textContent;
        if ($('div.description', xhr.responseXML).size() > 0) {
          details = details + '\n' + $('div.description', xhr.responseXML).get(0).textContent;
        }
      }
      return msg + details;
    }

    function saveSuccessCb (response, status, xhr) {
      var loc = xhr.getResponseHeader('Location'),
          type, fnode;
      if (xhr.status === 201) {
        if (loc) { // implicit data-replace="location" behavior
          window.location.href = loc;
        } else { // implicit data-replace="fragment" behavior
          type = this.spec.attr('data-replace-type') || 'all';
          fnode = $('#' + this.spec.attr('data-replace-target'));
          if (fnode.length > 0) {
            if (type === 'all') {
              fnode.replaceWith(xhr.responseText);
            } else if (type === 'swap') {
              this.swap = $(xhr.responseText); // FIXME: document context ?
              fnode.after(this.swap);
              fnode.hide();
              this.fragment = fnode; // cached to implement data-command="continue"
              $('button[data-command="continue"]', this.swap).bind('click', $.proxy(doSwap, this));
              $('button[data-command="reset"]', this.swap).bind('click', $.proxy(doReset, this));
            } // FIXME: implement other types like before|after|prepend|append
          } else {
            xtiger.cross.log('error', 'missing "data-replace-target" attribute to report "save" command success');
          }
        }
      } else {
        $axel.command.logError('Unexpected response from server (' + xhr.status + '). Save action may have failed', this.errTarget);
      }
    }

    function saveErrorCb (xhr, status, e) {
      var s;
      if (status === 'timeout') {
        $axel.command.logError("Save action taking too much time, it has been aborted, however it is possible that your page has been saved", this.errTarget);
      } else if (xhr.status === 409) { // 409 (Conflict)
        s = xhr.getResponseHeader('Location');
        if (s) {
          window.location.href = s;
        } else {
          $axel.command.logError(getOppidumErrorMsg(xhr), this.errTarget);
        }
      } else if (isResponseAnOppidumError(xhr)) {
        // Oppidum may generate 500 Internal error, 400, 401, 404
        $axel.command.logError(getOppidumErrorMsg(xhr), this.errTarget);
      } else if (xhr.responseText.search('Error</title>') !== -1) { // eXist-db error (empirical)
        $axel.command.logError(getExistErrorMsg(xhr), this.errTarget);
      } else if (e) {
        $axel.command.logError('Exception : ' + e.name + ' / ' + e.message + "\n" + ' (line ' + e.lineNumber + ')', this.errTarget);
      } else {
        $axel.command.logError('Error while connecting to "' + this.url + '" (' + xhr.status + ')', this.errTarget);
      }
    }

    return {
      execute : function (event) {
        var editor = $axel.command.getEditor(this.key),
            valid = true, method, dataUrl, transaction, data, errtarget, fields;
        if (editor) {
          url = editor.attr('data-src') || this.spec.attr('data-src') || '.'; // last case to create a new page in a collection
          if (url) {
            if (editor.attr('data-validation-output')) {
              fields = $axel(editor.spec.get(0)); // FIXME: define editor.getRoot()
              valid = $axel.binding.validate(fields, editor.attr('data-validation-output'), this.doc, editor.attr('data-validation-label'));
            }
            if (valid) {
              data = editor.serializeData();
              if (data) {
                method = editor.attr('data-method') || this.spec.attr('data-method') || 'post';
                transaction = editor.attr('data-transaction') || this.spec.attr('data-transaction');
                if (transaction) {
                  url = url + '?transaction=' + transaction;
                }
                $.ajax({
                  url : url,
                  type : method,
                  data : data,
                  dataType : 'xml',
                  cache : false,
                  timeout : 10000,
                  contentType : "application/xml; charset=UTF-8",
                  success : $.proxy(saveSuccessCb, this),
                  error : $.proxy(saveErrorCb, this)
                  });
                  editor.hasBeenSaved = true; // trick to cancel the "cancel" transaction handler
                  // FIXME: shouldn't we disable the button while saving ?
              } else {
                $axel.command.logError('The editor did not generate any data');
              }
            }
          } else {
            $axel.command.logError('The command does not know where to send the data');
          }
        } else {
          $axel.command.logError('There is no editor associated with this command');
        }
        return false;
      }
    };
  }());

  $axel.command.register('save', SaveCommand, { check : true });
}());
// file: axel-forms/src/commands/submit.js
/*****************************************************************************\
|                                                                             |
|  'submit' command object (XML submission through a form)                    |
|                                                                             |
|*****************************************************************************|
|                                                                             |
|  Required attributes :                                                      |
|  - data-target : id of the editor's container                               |
|  - data-form : id of the form to use for submission to the serevr           |
|                                                                             |
\*****************************************************************************/
(function () {

  function SubmitCommand ( identifier, node ) {
    var spec = $(node);
    this.key = identifier; /* data-target */
    this.formid = spec.attr('data-form');
    if (this.formid && ($('form#' + this.formid).length > 0)) { // checks form element existence
      node.disabled = false;
      spec.bind('click', $.proxy(this, 'execute'));
    } else {
      node.disabled = true;
      $axel.command.logError('Missing or invalid data-form attribute in submit command ("' + this.formid + '")');
    }
  }

  SubmitCommand.prototype = {
    // Saves using a pre-defined form element identified by its id
    // using a 'data' input field (both must be defined)
    // Note in that case there is no success/error feedback
    execute : function () {
      var f = $('#' + this.formid),
          d = $('#' + this.formid + ' > input[name="data"]' ),
          editor = $axel.command.getEditor(this.key);
      if (editor && (f.length > 0) && (d.length > 0)) {
        d.val(editor.serializeData());
        f.submit();
      } else {
        $axel.command.logError('Missing editor or malformed form element to submit data');
      }
    }
  };

  $axel.command.register('submit', SubmitCommand, { check : true });
}());
// file: axel-forms/src/commands/validate.js
/*****************************************************************************\
|                                                                             |
|  'validate' command object                                                  |
|                                                                             |
|*****************************************************************************|
|                                                                             |
|  Required attributes :                                                      |
|  - data-target : id of the editor's container to validate                   |
|  - data-validation: id of the DOM node where to display errors              |
|                                                                             |
\*****************************************************************************/

// TODO
// - customize server error decoding for Orbeon 3.8, eXist-DB, etc.

(function () {

  function ValidateCommand ( identifier, host, doc ) {
    var jhost = $(host);
    this.doc = doc;
    this.key = identifier;
    this.errid = jhost.attr('data-validation-output'); // FIXME: this.getParam('validate-output') (search param on host then on editor)
    this.cssrule = jhost.attr('data-validation-label');
    if (this.errid) {
      jhost.bind('click', $.proxy(this, 'execute'));
    } else {
      xtiger.cross.log('error', 'Missing "data-validation" attribute in "validation" command');
    }
  }

  ValidateCommand.prototype =  {
    
    execute : function (event) {
      var err, editor = $axel.command.getEditor(this.key);
      if (editor) {
        fields = $axel(editor.spec.get(0)); // FIXME: define editor.getRoot()
        $axel.binding.validate(fields, this.errid, this.doc, this.cssrule);
      }
    }
  };

  $axel.command.register('validate', ValidateCommand, { check : true });
}());
// file: axel-forms/src/commands/delete.js
/*****************************************************************************\
|                                                                             |
|  'delete' command object                                                    |
|                                                                             |
|*****************************************************************************|
|                                                                             |
|  Required attributes :                                                      |
|  - data-target : id of the editor's container                               |
|                                                                             |
|  Optional attributes :                                                      |
|  - data-replace-target                                                      |
|  - data-replace-type                                                        |
|                                                                             |
\*****************************************************************************/

// TODO
// - customize server error decoding for Orbeon 3.8, eXist-DB, etc.

(function () {

  function DeleteCommand ( identifier, node, doc ) {
    this.doc = doc || document;
    this.spec = $(node);
    this.key = identifier;
    this.spec.bind('click', $.proxy(this, 'execute'));
  }

  DeleteCommand.prototype = (function () {

    // FIXME: Factorize
    function isResponseAnOppidumError (xhr) {
      return $('error > message', xhr.responseXML).size() > 0;
    }

    // FIXME: Factorize
    function getOppidumErrorMsg (xhr) {
      var text = $('error > message', xhr.responseXML).text();
      return text || xhr.status;
    }

    // FIXME: Factorize
    // Tries to extract more info from a server error. Returns a basic error message
    // if it fails, otherwise returns an improved message
    // Compatible with eXist 1.4.x server error format
    function getExistErrorMsg (xhr) {
      var text = xhr.responseText, status = xhr.status;
      var msg = 'Error ! Result code : ' + status;
      var details = "";
      var m = text.match('<title>(.*)</title>','m');
      if (m) {
        details = '\n' + m[1];
      }
      m = text.match('<h2>(.*)</h2>','m');
      if (m) {
        details = details + '\n' + m[1];
      } else if ($('div.message', xhr.responseXML).size() > 0) {
        details = details + '\n' + $('div.message', xhr.responseXML).get(0).textContent;
        if ($('div.description', xhr.responseXML).size() > 0) {
          details = details + '\n' + $('div.description', xhr.responseXML).get(0).textContent;
        }
      }
      return msg + details;
    }

    // FIXME: Factorize subparts
    function successCb (response, status, xhr) {
      var loc = xhr.getResponseHeader('Location'),
          type, fnode, newblock;
      if (xhr.status === 200) {
        if (loc) { // implicit data-replace="location" behavior
          window.location.href = loc;
        } else { // implicit data-replace="fragment" behavior
          type = this.spec.attr('data-replace-type') || 'all';
          fnode = $('#' + this.spec.attr('data-replace-target'));
          if (fnode.length > 0) {
            if (type === 'all') {
              newblock =  fnode.replaceWith(xhr.responseText);
            } else if (type === 'swap') {
              if (this.swap) { // confirmation dialog already there
                this.swap.replaceWith(xhr.responseText)
              } else {
                this.swap = $(xhr.responseText); // FIXME: document context ?
                fnode.after(this.swap);
                fnode.hide();
                this.fragment = fnode; // cached to implement followup command returning to initial view
              }
              newblock = this.swap;
            }
            // followup actions protocol
            $('button[data-command="proceed"]', newblock).bind('click', $.proxy(doDelete, this));
            $('button[data-command="cancel"]', newblock).bind('click', $.proxy(doCancel, this));
          } else {
            $axel.command.logError('Bad page design to complete delete action ("data-replace-target" error)');
          }
        }
      } else {
        $axel.command.logError('Unexpected response from server (' + xhr.status + '). Delete action may have failed');
      }
    }

    // FIXME: Factorize subpart
    function errorCb (xhr, status, e) {
      var s;
      if (status === 'timeout') {
        $axel.command.logError("Delete action taking too much time, it has been aborted, however it is possible that the resource has been deleted", this.errTarget);
      } else if (isResponseAnOppidumError(xhr)) {
        // Oppidum may generate 500 Internal error, 400, 401, 404
        $axel.command.logError(getOppidumErrorMsg(xhr), this.errTarget);
      } else if (xhr.responseText.search('Error</title>') !== -1) { // eXist-db error (empirical)
        $axel.command.logError(getExistErrorMsg(xhr), this.errTarget);
      } else if (e) {
        $axel.command.logError('Exception : ' + e.name + ' / ' + e.message + "\n" + ' (line ' + e.lineNumber + ')', this.errTarget);
      } else {
        $axel.command.logError('Error while talking to server (' + xhr.status + ')', this.errTarget);
      }
    }

    // Send delete request to server
    function doDelete () {
      var url, editor = $axel.command.getEditor(this.key);
      if (editor) {
        url = editor.attr('data-src'); // delete resource loaded into editor
        $.ajax({
          url : url,
          type : 'delete',
          cache : false,
          timeout : 10000,
          success : $.proxy(successCb, this),
          error : $.proxy(errorCb, this)
        });
        
      }
    }

    // Cancel delete, redisplays original fragment (usually the editor)
    function doCancel () {
      if (this.swap) {
        this.swap.remove();
        delete this.swap;
      }
      if (this.fragment) {
        this.fragment.show();
      }
    }

    return {
      // TODO: directly delete when 'data-confirm-action' missing !
      execute : function (event) {
        var url, editor = $axel.command.getEditor(this.key);
        if (editor) {
          url = editor.attr('data-src');
          if (url) {
            if (! /\/$/.test(url)) {
              url  += '/';
            }
            // pre-flight request obtained from adding : FIXME: data-preflight-action ? 
            url += (this.spec.attr('data-confirm-action') || 'delete');
            $.ajax({
              url : url,
              type : 'get',
              cache : false,
              timeout : 10000,
              success : $.proxy(successCb, this),
              error : $.proxy(errorCb, this)
            });
          } else {
            $axel.command.logError('Missing "data-src" parameter on the editor');
          }
        }
      }
    };
  }());

  $axel.command.register('delete', DeleteCommand, { check : true });
}());
