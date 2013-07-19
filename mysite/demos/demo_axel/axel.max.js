
// file: axel/src/core/loader.js
/* ***** BEGIN LICENSE BLOCK *****
 *
 * @COPYRIGHT@
 *
 * This file is part of the Adaptable XML Editing Library (AXEL), version @VERSION@ 
 *
 * @LICENSE@
 *
 * Web site : http://media.epfl.ch/Templates/
 * 
 * Author(s) : Stephane Sire
 * 
 * ***** END LICENSE BLOCK ***** */
 
/*
 * Single global object used by XTiger Forms library. 
 */
if (typeof xtiger == "undefined" || !xtiger) {
  var xtiger = {};  
  xtiger.COMPONENT = 1; // XTiger node type constants
  xtiger.REPEAT = 2;
  xtiger.USE = 3;
  xtiger.BAG = 4;         
  xtiger.ATTRIBUTE = 5; 
  xtiger.UNKNOWN = -1;  
}

// the following modules will be filled by other library files
/** @namespace Contains parsing facilities to handle the XTiger XML language */
xtiger.parser = {};
/** @namespace Contains editors and plugins */
xtiger.editor = {};
/** @namespace Contains utilities to make the library cross-browser */
xtiger.cross = {};
/** @namespace Contains various utility methods */
xtiger.util = {};

/**
 * Single global object that contains DOM dependent methods which may also 
 * depend of the user agent.
 */
if (typeof xtdom == "undefined" || !xtdom) {
  xtdom = {}; 
}

/**
 * Contains methods for managing the modules under the xtiger namespace.
 * It will evolve toward dynamical module loading.
 */
// xtiger.util.Loader = {};

/**
 * Associates a hash storage with a document. This is used to share objects for the life time
 * of a document, such as a keyboard manager, a tabgroup manager, etc.
 */

// a simpe Hash could be enough to manage sessions but maybe we will add methods in the future
xtiger.util.Session = function () { 
  this.store = {};
}

xtiger.util.Session.prototype = { 
  save : function (name, object) {
    this.store[name] = object;
  },
  load : function (name) {
    return this.store[name];
  }
}

// Lazily extends document object with a xtiger.util.Session object and/or returns it.
// @doc is the document to extend
// We use this method (document extension) because if the document is deleted by the user
// then it's session will also be deleted without the need to call a Session.delete() method
xtiger.session = function (doc) {
  if (! doc._xtigerSession) {
    doc._xtigerSession = new xtiger.util.Session ();
  }
  return doc._xtigerSession;
}

/**
 * Resource manager for managing access to UI resources (icons at that time)
 * It could evolve to also manage error messages and i18n
 */
xtiger.util.Resources = function () { 
  this.bundles = {}; // raw bundles (no paths)
  xtiger.bundles = {}; // "mount" point for exporting bundles to the editors
}

xtiger.util.Resources.prototype = {
  // Copies keys from the bundle name into xtiger.bundles namespace
  _mountBundle : function (name, baseurl) {
    var bsrc = this.bundles[name];
    var bdest = xtiger.bundles[name];
    for (var k in bsrc) {
      bdest[k] = baseurl + name + '/' + bsrc[k];
    }   
  },  
  // A bundle is just a hash where each key points to an icon file name
  // It is expected that there will be one bundle for each editor that need to display icons in the UI  
  addBundle : function (name, bundle) { 
    this.bundles[name] = bundle;
    xtiger.bundles[name] = {}; // makes the "mount" point
    for (var k in bundle) { // copy icon URLs 
      xtiger.bundles[name][k] = bundle[k]; // although it should be copied with setBase()
    }     
  },
  // Sets the base path for all the icon URLs in all the bundles
  setBase : function (baseUrl) {
    if (baseUrl.charAt(baseUrl.length -1) != '/') { // forces a trailing slash
      baseUrl = baseUrl + '/';
    }   
    for (var bkey in this.bundles) {
      this._mountBundle(bkey, baseUrl);
    }   
  }
}

// Resource manager instance (Singleton)
xtiger.resources = new xtiger.util.Resources ();
// bundles will be mounted under "xtiger.bundles"

/**
 * Central factory registry 
 * This allows to share some classes (essentially devices) between editors with decoupling
 */
xtiger.util.FactoryRegistry = function () { 
  this.store = {};
}

xtiger.util.FactoryRegistry.prototype = { 
  
  registerFactory : function (name, factory) {  
    if (this.store[name]) {
      alert("Error (AXEL) attempt to register an already registered factory : '" + name + "' !");
    } else {
      this.store[name] = factory;
    }
  },
  
  getFactoryFor : function (name) {
    if (! this.store[name]) {
      alert("Fatal Error (AXEL) unkown factory required : '" + name + "' \nYour editor will NOT be generated !");
      // FIXME: we could return a "dummy" factory that would return a "dummy" factory to getInstance
    } else {
      return this.store[name];
    }
  }
}

// Resource manager instance (Singleton)
xtiger.registry = new xtiger.util.FactoryRegistry ();
xtiger.factory = function (name) {  return xtiger.registry.getFactoryFor(name); } // simple alias


// file: axel/src/core/dom.js
/* ***** BEGIN LICENSE BLOCK *****
 *
 * @COPYRIGHT@
 *
 * This file is part of the Adaptable XML Editing Library (AXEL), version @VERSION@ 
 *
 * @LICENSE@
 *
 * Web site : http://media.epfl.ch/Templates/
 * 
 * Author(s) : Stephane Sire, Antoine Yersin
 * 
 * ***** END LICENSE BLOCK ***** */

/*****************************************************************************\
|                                                                             |
|  xtdom module                                                               |
|                                                                             |
|  Low level functions to plug into the DOM                                   |
|  Not browser dependent                                                      |
|                                                                             |
|*****************************************************************************|
|  See defaultbrowser.js or iebrowser.js for browser depedent functions       |
|                                                                             |
\*****************************************************************************/

xtdom.counterId = 0;
  
xtdom.genId = function () {
  return xtdom.counterId++;
}

xtdom.createTextNode = function (doc, text) {
  return doc.createTextNode(text);
}

xtdom.hasAttribute = function (node, name) {
  return node.hasAttribute(name);
}

/**
 * Removes the elemet passed as parameter
 */
xtdom.removeElement = function (element) {
  var _parent = element.parentNode;
  if (! _parent)
    return; // Sanity check, don't remove elements that are not in DOM
  _parent.removeChild(element);
}

// Returns true if node is an XTiger element or if it contains at least one
xtdom.containsXT = function (node) {
  if (node.nodeType == xtdom.ELEMENT_NODE) {
    if (xtdom.isXT(node)) {
      return true; 
    } else {
      if (node.childNodes && node.childNodes.length > 0) {
        for (var i = 0; i < node.childNodes.length; i++) 
          if (xtdom.containsXT(node.childNodes[i])) {
            return true;
          }
      }
    }
  } 
  return false;
}

// Return the first 'xt:menu-marker' element within node or false otherwise
// Look for a marker with a target="targetValue" attribute if targetValue is defined
xtdom.getMenuMarkerXT = function (node, targetValue) {
  var cur, i, res = false;
  var results = xtdom.getElementsByTagNameXT(node, 'menu-marker');
  if (results.length > 0) {     
    for (i = 0; i < results.length; i++) {
      cur = results.item(i);
      if (((targetValue === undefined) && (!xtdom.hasAttribute(cur, 'target')))
        || (cur.getAttribute('target') === targetValue)) {
        res = cur;
        break;
      }
    }
    // res = results[0];
  }
  return res; 
}

// Returns a string representing the tag name associated with a XTiger Node
xtdom.getTagNameXT = function (node) {    
  var key = (xtiger.ATTRIBUTE == xtdom.getNodeTypeXT(node)) ? 'name' : 'label';
  return node.getAttribute(key);
}

// Returns a string representing the content of an XTiger node or null if content is empty or it contains only spaces
// Pre-condition: the node is supposed to contain only plain text or to contain only HTML elements
// in which case the innerHTML of the children will be concatenated (first level tag names are removed)
// This is the case for instance of a xt:use of a "string" primitive type
// FIXME: that method should be able to dump any content (including XML) but innerHTML does not work on node
// which is not an HTML node (it's an xt:use)
xtdom.extractDefaultContentXT = function (node) {
  var dump;   
  if (xtiger.ATTRIBUTE == xtdom.getNodeTypeXT(node)) {
    dump = node.getAttribute('default');
  } else if (node.childNodes) {
    for (var i = 0; i < node.childNodes.length; i++) {
      var str;
      var cur = node.childNodes[i];
      if (cur.nodeType == xtdom.ELEMENT_NODE) {
        str = cur.innerHTML;
      } else { // assumes TEXT_NODE
        str = cur.nodeValue;
      }       
      if (dump) {
        dump += str;
      } else {
        dump = str;
      }
    }
  }
  if (dump && (-1 === dump.search(/\S/))) { // empty string
    dump = null;
  }
  return dump;
}

// Returns the first DOM Element node which is a child of node or undefined otherwise
xtdom.getFirstElementChildOf = function (node) {
  var res;
  for (var i=0; i < node.childNodes.length; i++) {   
    if (node.childNodes[i].nodeType == xtdom.ELEMENT_NODE) {
      res = node.childNodes[i];
      break;
    }     
  }
  return res; 
}

// Inserts all the nodes in nodes in the target DOM just after target
// As a side effect all the nodes are removed from nodes
xtdom.moveNodesAfter = function (nodes, target) {
  var n;   
  // sets next to the next sibling after target if it exists or to null otherwise
  if (target.nextSibling) {
    var next = target.nextSibling;
    while (n = nodes.shift()) {
      next.parentNode.insertBefore(n, next);
    }
  } else { // it was the last sibling...
    while (n = nodes.shift()) {
      target.parentNode.appendChild(n);
    }   
  }
}

xtdom.moveChildrenOfAfter = function (parentSrc, target) {
  var n;   
  // sets next to the next sibling after target if it exists or to null otherwise
  if (target.nextSibling) {
    var next = target.nextSibling;
    while (n = parentSrc.firstChild) {
      parentSrc.removeChild (n);
      next.parentNode.insertBefore(n, next);
    }
  } else { // it was the last sibling...
    while (n = parentSrc.firstChild) {
      parentSrc.removeChild (n);
      target.parentNode.appendChild(n);
    }   
  }
}

// Imports a copy of all the child nodes of a source node into a target node.
// targetDoc is the target document
// destNode is the target node and it must be owned by targetDoc
xtdom.importChildOfInto = function (targetDoc, srcNode, destNode) {
  for(var i = 0; i<srcNode.childNodes.length; i++) {
    var src = srcNode.childNodes[i];
    var copy = xtdom.importNode (targetDoc, srcNode.childNodes[i], true);
    destNode.appendChild(copy);   
  }
}
  
// Replaces the node "former" by all the children of the node "newer"
// Prec-condition: former and newer must be owned by the same document
// The "former" node must have a parent node, it must not be a dangling node
// At the end, "newer" is an empty node
// accu is a list of the nodes which have been moved
xtdom.replaceNodeByChildOf = function (former, newer, accu) {
  var parent = former.parentNode;
  var n;
  while (n = newer.firstChild) {
    newer.removeChild (n);
    parent.insertBefore (n, former, true);  
    if (accu) {
      accu.push (n);
    }
  }
  parent.removeChild(former); 
}

// FIXME: shouldn't we purge event handlers before 
// see http://www.crockford.com/javascript/memory/leak.html
xtdom.removeChildrenOf = function (aNode) {
  aNode.innerHTML = "";
  // var n;
  // while (n = aNode.firstChild) {
  //  aNode.removeChild(n);
  // }    
}
  
/// Pre-requisite: former and newer must belong to the same document  
xtdom.moveChildOfInto = function (former, newer, accu) {
  var n;
  // inserts the child of former into newer
  while (n = former.firstChild) {
    former.removeChild (n); // FIXME: maybe useless (DOM API removes nodes when moving them) ?
    newer.appendChild (n); // FIXME: maybe no cross-browser !!! 
    if (accu) {
      accu.push (n);
    }
  }   
}

// Returns the value of the display property of the DOM aNode if it has been defined inline
// (i.e. directly in the markup). Returns an empty string otherwise
xtdom.getInlineDisplay = function  (aNode) {
  var res = '';
  if ((aNode.style) && (aNode.style.display)) {
    res = aNode.style.display;
  }
  return res;
}

xtdom.getSelectedOpt = function (sel) {
  for (var i = 0; i < sel.options.length; i++) {
          if (sel.options[i].selected) {
      break;
      }
  }
  return i;
}

xtdom.setSelectedOpt = function (sel, index) {
  sel.selectedIndex = index; // FIXME: is it cross-browser ?
} 

xtdom.addClassName = function (node, name) {
  // FIXME: currently the test is fooled by an already set class name that contains name 
  if (node.className) {
    if (node.className.search(name) == -1) {
      if (node.className.length == 0) {
        node.className = name;
      } else {
        node.className += " " + name;
      }
    } // else it already has the class name (or a sub-set)
  } else {
    node.className = name;
  }
}

xtdom.removeClassName = function (node, name) {
  // FIXME: see addClassName
  if (node.className) {
    var index = node.className.search(name);
    if (index != -1) {
      node.className = node.className.substr(0, index) + node.className.substr(index + name.length);
    }
  }
}

xtdom.replaceClassNameBy = function (node, formerName, newName) {
  // FIXME: see addClassName  
  var index = node.className.search(formerName);
  if (index != -1) {
    node.className = node.className.substr(0, index) + newName + node.className.substr(index + formerName.length);
  } else {
    xtdom.addClassName (node, newName);
  } 
}

/**
 * @param {string} aStyle A CSS style given as dashed parameter (foo-bar, not fooBar)
 */
xtdom.getComputedStyle = function (aNode, aStyle) {
  if (!aNode || !aNode.ownerDocument) // Safety guard
    return null;
  var _doc = aNode.ownerDocument; 
  if (window.getComputedStyle) {
    return window.getComputedStyle(aNode, null).getPropertyValue(aStyle);
  }
  else if (aNode.currentStyle) {
    aStyle = aStyle.replace(/\-(\w)/g, function (strMatch, p1){
      return p1.toUpperCase();
    });
    return aNode.currentStyle[aStyle];
  }
  return null; // TODO remove, only for debugging purpose
}

//From http://www.quirksmode.org/js/findpos.html
// Finds the absolute position of object obj relatively to the body !
xtdom.findPos = function (obj) {
  var curleft = curtop = 0;
  if (obj.offsetParent) {
    curleft = obj.offsetLeft
    curtop = obj.offsetTop
    if (document.defaultView)
      var position = document.defaultView.getComputedStyle(obj,null).getPropertyValue('position');
    else if (document.uniqueID)
      var position = obj.currentStyle.position;
    if (obj.scrollTop && (position == 'absolute')) {
      curtop -= obj.scrollTop;
    }   
    if (obj.scrollLeft && (position == 'absolute')) {
      curleft -= obj.scrollLeft;
    }       
    while (obj = obj.offsetParent) {
      curleft += obj.offsetLeft
      curtop += obj.offsetTop
      if (document.defaultView)
        var position = document.defaultView.getComputedStyle(obj,null).getPropertyValue('position');
      else if (document.uniqueID)
        var position = obj.currentStyle.position;
      if (obj.scrollTop && (position == 'absolute')) {
        curtop -= obj.scrollTop;
      }     
      if (obj.scrollLeft && (position == 'absolute')) {
        curleft -= obj.scrollLeft;
      }             
    }
  }
  return [curleft,curtop];
};

// Returns an array with the width and height of aHandle's window   
// plus the scroll width and height
// This is useful to calculate how far aHandle (in absolute position)
// is to the window border
// From http://www.howtocreate.co.uk/tutorials/javascript/browserwindow
// FIXME: move to popup device ?
xtdom.getWindowLimitFrom = function (aHandle) {  
  var myWidth = 0, myHeight = 0, scrollLeft = 0, scrollTop = 0;
  var oDoc = aHandle.ownerDocument;                
  var win= oDoc.defaultView || oDoc.parentWindow;  
  // in case template shown inside an iframe

  // 1. Dimension
  if( typeof( win.innerWidth ) == 'number' ) {
    //Non-IE
    myWidth = win.innerWidth;
    myHeight = win.innerHeight;
  } else if( oDoc.documentElement && ( oDoc.documentElement.clientWidth || oDoc.documentElement.clientHeight ) ) {
    //IE 6+ in 'standards compliant mode'
    myWidth = oDoc.documentElement.clientWidth;
    myHeight = oDoc.documentElement.clientHeight;
  } else if( oDoc.body && ( oDoc.body.clientWidth || oDoc.body.clientHeight ) ) {
    //IE 4 compatible
    myWidth = oDoc.body.clientWidth;
    myHeight = oDoc.body.clientHeight;
  }       
                
  // 2.  Scrolling 
  if( typeof( win.pageYOffset ) == 'number' ) {
    //Netscape compliant
    scrollTop = win.pageYOffset;
    scrollLeft = win.pageXOffset;
  } else if( document.body && ( document.body.scrollLeft || document.body.scrollTop ) ) {
    //DOM compliant
    scrollTop = document.body.scrollTop;
    scrollLeft = document.body.scrollLeft;
  } else if( document.documentElement && ( document.documentElement.scrollLeft || document.documentElement.scrollTop ) ) {
    //IE6 standards compliant mode
    scrollTop = document.documentElement.scrollTop;
    scrollLeft = document.documentElement.scrollLeft;
  }

  return [myWidth + scrollLeft, myHeight + scrollTop];      
  // FIXME: add correction with scrollLeft
}
// file: axel/src/core/domdatasource.js
/* ***** BEGIN LICENSE BLOCK *****
 *
 * @COPYRIGHT@
 *
 * This file is part of the Adaptable XML Editing Library (AXEL), version @VERSION@ 
 *
 * @LICENSE@
 *
 * Web site : http://media.epfl.ch/Templates/
 * 
 * Author(s) : Stephane Sire
 * 
 * ***** END LICENSE BLOCK ***** */

/* 
 * An DOMDataSource contains some XML data that can be loaded into an editor built from an XTiger template
 * This implementation encapsulates an XML Document object containing the data, which is either
 * passed directly (initFromDocument) or which can be passed from a string (initFromString)
 */
xtiger.util.DOMDataSource = function (source) {
  var d; // XML document
  this.xml = null; // main XML data
  this.stack = [];  
  if (typeof source === "string") {
    this.initFromString(source);
  } else {
    this.initFromDocument(source);
  }
}

xtiger.util.DOMDataSource.prototype = {

  // Return true of the data source has been correctly initialized, false otherwise
  hasData : function () {
    return (null != this.xml);
  },   
  
  // Internal method to set root document from a DOM element node
  _setRootNode : function (n) {
    this.xml = n;
  },

  // Initializes data source from a DOM Document 
  // Note that document may be false or undefined to simplify error management
  // Returns true on sucess, false otherwise
  initFromDocument : function (doc) {
    var root;
    this.xml = null;                      
    if (doc && doc.documentElement) {
      root = doc.documentElement;
      this._setRootNode(root);
    }
    return (this.xml != null);
  },

  // Initializes data source with a string
  initFromString : function (str) {
    var res = true;
    this.xml = null;                      
    try {
      var parser = xtiger.cross.makeDOMParser ();
      var doc = parser.parseFromString(str, "text/xml");
      this.initFromDocument(doc);
    } catch (e) {
      alert('Exception : ' + e.message);
      res = false;
    }
    return res;
  },   

  // FIXME: currently for an attribute point it returns the name of the parent node
  // and not the name of the attribute (see getAttributeFor)
  nameFor : function (point) {       
    if (point instanceof Array) {
      return xtdom.getLocalName(point[0]);      
    } else {                          
      return null; // point must be -1
    }
  },

  lengthFor : function (point) {
    if (point instanceof Array) {
      return point.length - 1;
      // FIXME: should we consider no content as content ? I do not think since it may be an empty node with attribute(s)
      // if ((point.length === 2) && (point[1] === null)) {
      //   return 0;
      // } else {
      //   return point.length - 1;
      // }
    } else {
      return 0;
    }   
  }, 
  
  makeRootVector : function (rootNode) {
    var res = [rootNode];
    if (rootNode) {
      var c = rootNode.childNodes;
      for (var i = 0; i < c.length; i++) {      
        var cur = c.item(i);
        if (cur.nodeType == xtdom.ELEMENT_NODE) {
          res.push(cur);
        }
      } 
    }
    return res; 
  },
  
  // Returns children of the root in an array
  // In our content model, the root node can not have text content
  getRootVector : function () {
    return this.makeRootVector(this.xml);
  },  
    
  // Returns true if the point contains some content (element nodes, not just text content)
  // for a node called name in FIRST position, or returns false otherwise
  hasDataFor : function (name, point) {
    var res = false;          
    if ('@' == name.charAt(0)) { // assumes point[0] DOM node
      if (point !== -1) {
        res = xtdom.hasAttribute(point[0], name.substr(1));         
      }
    } else if ((point instanceof Array) && (point.length > 1))  {  
      if (point[1] && (point[1].nodeType == xtdom.ELEMENT_NODE)) { // otherwise point has no descendants
        var nodeName = xtdom.getLocalName(point[1]);
        var found = name.search(nodeName);                                                          
        // res =  (found != -1) && ((found + nodeName.length) == name.length) || (name.charAt(found + nodeName.length) == ' ');
        res =  (found != -1) && (((found + nodeName.length) == name.length) || (name.charAt(found + nodeName.length) == ' '));
      }
    }
    return res;
  },     
           
  // Only terminal data node have a string content (no mixed content in our model)
  // Returns null if there is no data for the point
  getDataFor : function (point) {
    if ((point instanceof Array) && (point.length > 1)) {     
      // FIXME: should we check it's not empty (only spaces/line breaks) ?
      return point[1];
    } else {
      return null;
    }
  },      
    
  // Returns true if the point is empty, i.e. it contains no XML data nor string (or only the empty string)
  // FIXME: currently a node with only attributes is considered as empty and mixed content maybe be handled 
  // incorrectly
  isEmpty : function (point) {
    var res = false;           
    if ((point instanceof Array) && (point.length > 1)) { 
      // terminal string node or non terminal with children (including mixed content)
      if (point.length == 2) { // then it must be a text string (terminal data node)
        if (typeof(point[1]) == 'string') { 
          res = (point[1].search(/\S/) == -1); // empty string
        }
      }
    } else { // no data for sure (must be -1)
      res = true;
    }
    return res;
  },
  
  // Pre-condition: point must be an Array [n, e1, e2, ...] of DOM nodes
  // Returns the n-th child of node n
  getPointAtIndex : function  (name, index, point) {  
    var res;
    var n = point.splice(index, 1)[0]; // splice returns an array, hence we take result[0]
    var c = n.childNodes;
    if ((c.length == 1) && (c.item(0).nodeType == xtdom.TEXT_NODE)) {
      var content = c.item(0).data; // FIXME: maybe we should concatenate all the string content (?)
      res = [n, content];     
    } else {
      res = [n];            
      for (var i = 0; i < c.length; i++) {
        var cur = c.item(i);
        if (cur.nodeType == xtdom.ELEMENT_NODE) {
          res.push(cur);
        }
      }                         
      if (res.length == 1) { // empty node (treated as null text content)
        res.push(null);
      } 
    }
    return res;   
  },    
  
  hasVectorFor : function (name, point) {
    if (point instanceof Array) {
      for (var i = 1; i < point.length; i++) {
        if ((point[i] !== null) && (point[i].nodeType == xtdom.ELEMENT_NODE) && (xtdom.getLocalName(point[i]) == name)) { // since there is no mixed content, this is an Element
          return true;
        }       
      }
    }
    return false;
  },  
  
  // Makes a new point for node labelled name in the current point
  // The returned point is removed from the current point
  // In our content model, the new point is either a text node singleton
  // or it is a vector of element nodes (no mixed content) 
  getVectorFor : function (name, point) {
    if (point instanceof Array) {
      for (var i = 1; i < point.length; i++) {
        if ((point[i] !== null) && (point[i].nodeType == xtdom.ELEMENT_NODE) && (xtdom.getLocalName(point[i]) == name)) { // since there is no mixed content, this is an Element
          return this.getPointAtIndex(name, i, point);
        }       
      }
    }
    return -1;
  },   
  
  hasAttributeFor : function (name, point) {  
    return (point instanceof Array) && (point[0].getAttribute(name) != null);
  },  
          
  // Makes a new point for the attribute named 'name' in the current point
  // Quite simple: a point for an attribute is just a [node, value] array
  // that means you cannot use such points for navigation !    
  // FIXME: sanity check against attribute point in getVectorFor...
  getAttributeFor : function (name, point) {  
    var res = -1
    if (point instanceof Array) {
      var n = point[0]; // FIXME: sanity check even if can't be null per-construction ?
      var attr = n.getAttribute(name);
      if (attr) {
        n.removeAttribute(name);
        res = [n, attr]; // simulates text node
      }
    }
    return res;
  },  
  
  // FORTIFICATION
  hasVectorForAnyOf : function (names, point) {
    if (point instanceof Array) {
      for (var i = 1; i < point.length; i++) {        
        for (var j = 0; j < names.length; j++) {
          if ((point[i] !== null) && (point[i].nodeType == xtdom.ELEMENT_NODE) && xtdom.getLocalName(point[i]) == names[j]) {
            return true;
          }       
        }
      }
    }
    return false;
  },

  getVectorForAnyOf : function (names, point) {
    if (point instanceof Array) {
      for (var i = 1; i < point.length; i++) {        
        for (var j = 0; j < names.length; j++) {
          if ((point[i] !== null) && (point[i].nodeType == xtdom.ELEMENT_NODE) && xtdom.getLocalName(point[i]) == names[j]) {
            return this.getPointAtIndex(names[j], i, point);
          }       
        }
      }
    }
    return -1;
  }   
        
} 

// file: axel/src/core/domlogger.js
/* ***** BEGIN LICENSE BLOCK *****
 *
 * @COPYRIGHT@
 *
 * This file is part of the Adaptable XML Editing Library (AXEL), version @VERSION@ 
 *
 * @LICENSE@
 *
 * Web site : http://media.epfl.ch/Templates/
 * 
 * Author(s) : Stephane Sire
 * 
 * ***** END LICENSE BLOCK ***** */

/*
 * Represents a node in a tree-like memory structure that mimics a DOM for XTiger Forms.
 */         
xtiger.util.PseudoNode = function (type, value) {
  this.type = type;
  this.discard = false;
  if (type === xtiger.util.PseudoNode.ELEMENT_NODE) {
    this.name = value;
    this.attributes = null;
    this.content = null;
  } else {
    this.content = value;
  }
};
            
xtiger.util.PseudoNode.TEXT_NODE = 0;
xtiger.util.PseudoNode.ELEMENT_NODE = 1;
xtiger.util.PseudoNode.MIXED_NODE = 2;
xtiger.util.PseudoNode.NEWLINE = '\n';

xtiger.util.PseudoNode.prototype = {     

  indent : ['', '  '], // cached space strings for indentation when dumping

  discardNodeIfEmpty : function () {       
    this.discard = true;
  },     
  
  mix : function () {
    var tmp;
    if (this.type !== xtiger.util.PseudoNode.MIXED_NODE) {
      if (this.content && !(this.content instanceof Array)) {
        tmp = this.content;
        this.content = [tmp];
      }
      this.type = xtiger.util.PseudoNode.MIXED_NODE;
    }   
  },
  
  addChild : function (c) {
    if ((this.type !== xtiger.util.PseudoNode.MIXED_NODE) && (xtiger.util.PseudoNode.TEXT_NODE === c.type)) {
      // small optimization: in XTiger Forms models, text nodes are terminal and unique
      this.content = c;
    } else {
      if (! this.content) {
        this.content = [];
      }
      if (this.content instanceof Array) {
        this.content.push(c);
      } else {
        // alert('Attempt to save mixed content in template !');
        xtiger.cross.log('error', 'Mixed content [' + this.content + '] in ' + this.name);
      }
    }
  },
  
  addAttribute : function (name, value) { 
    if (! this.attributes) {
      this.attributes = {};
    }
    this.attributes[name] = value;
  },    

  getIndentForLevel : function (level, isMixed) {   
    var l = isMixed ? 0 : level;
    if (typeof this.indent[l] !== 'string') {  
      var spacer = this.indent[l - 1];
      spacer += this.indent[1];
      this.indent[l] = spacer;
    }
    return this.indent[l];
  },    
             
  // Returns a string representing the attributes
  // the returned string starts with a space      
  // Pre-condition: this.attributes must exist
  dumpAttributes : function () {
    var k, text = '';
    for (k in this.attributes) {
      text += ' ';
      text += k;
      text += '="';
      text += xtiger.util.encodeEntities(this.attributes[k]);
      text += '"';                        
    }
    return text;
  },                           

  // Indented (and recursive) dump method
  dump : function (level, isMixed) {   
    if (xtiger.util.PseudoNode.TEXT_NODE == this.type) {
      return xtiger.util.encodeEntities(this.content);
    } else {    
      var text = this.getIndentForLevel(level, isMixed); // copy indentation string
      if (this.content) {
        // opening tag
        text += '<';
            text += this.name;   
            if (this.attributes) {
          text += this.dumpAttributes ();
        }
        text += '>'; 
        if (this.content instanceof Array) {   
          if ((this.type !== xtiger.util.PseudoNode.MIXED_NODE) && !isMixed) {
            text += xtiger.util.PseudoNode.NEWLINE;  
          }
          for (var i = 0; i < this.content.length; i++) {
            text += this.content[i].dump(level + 1, this.type === xtiger.util.PseudoNode.MIXED_NODE); 
          }                                
          if ((this.type !== xtiger.util.PseudoNode.MIXED_NODE) && !isMixed) {
            text += this.getIndentForLevel(level, isMixed);
          }
        } else {                      
          // only one children, this is a text per construction, do not insert NEWLINE          
          text += xtiger.util.encodeEntities(this.content.content); // short circuit recursive call         
        } 
        // closing tag;  
        text += '</';
        text += this.name;
        text += '>';        
      } else { // empty tag   
        text += '<';
        text += this.name;    
        if (this.attributes) {
          text += this.dumpAttributes ();
        } else if (this.discard) {
          return ''; // optional node which is empty
        }
        text += '/>';                  
      }                                        
      if (!isMixed) {
        text += xtiger.util.PseudoNode.NEWLINE;  
      }
      return text;
    }
  }
}

/**
 * Logs data strings into a tree-like memory structure.
 * This helper object allows to dump an XTiger template content before submitting it to a server.
 */         
xtiger.util.DOMLogger = function () {
  this.stack = [];
  this.curTop = null; // current anchoring point                          
  this.curAttr = null; // can manage one attribute at a time
  this.root = null; // lazy creation in OpenTag     
}

xtiger.util.DOMLogger.prototype = {
  // Declares the current node as optional if it is empty
  discardNodeIfEmpty : function () {       
    if (this.curTop) { this.curTop.discardNodeIfEmpty() }
  },              
  // Sets current node as a mixed content node
  // Pre-condition: there must be at least one node (openTag called)
  allowMixedContent : function () {
    if (this.curTop) {
      this.curTop.mix();
    }
  },    
  openAttribute : function (name) {
    this.curAttr = name;    
  },   
  closeAttribute : function (name) {
    if (this.curAttr != name) {
      alert('Attempt to close an attribute ' + name + ' while in attribute ' + this.curAttr + '!');
    }
    this.curAttr = null;    
  },  
  openTag : function (name) {
    var n = new xtiger.util.PseudoNode (xtiger.util.PseudoNode.ELEMENT_NODE, name);
    if (! this.root) { // stores root for later reuse (e.g. dump)
      this.root = n;      
    }                            
    if (this.curTop) {
      this.curTop.addChild (n);      
    }
    this.stack.push(this.curTop);
    this.curTop = n;
  },
  closeTag : function (name) {
    this.curTop = this.stack.pop(); // FIXME: sanity check this.stack ?
  },  
  emptyTag : function (name) {
    this.openTag(name);
    this.closeTag(name);
  },
  write : function (text) {                                                      
   // FIXME: sanity check this.curTop ?
    if (this.curAttr) {
      this.curTop.addAttribute(this.curAttr, text);
    } else {            
      var n = new xtiger.util.PseudoNode(xtiger.util.PseudoNode.TEXT_NODE, text);    
      this.curTop.addChild (n);
   }
  },
  // Adds an attribute to the current node at the top 
  writeAttribute : function (name, value) {
    this.curTop.addAttribute(name, value);
  }, 
  // Pretty prints XML content to a string
  dump : function () {
    if (this.root) {
      return this.root.dump(0);
    } else {
      return xtiger.util.PseudoNode.prototype.indent[level] + '<document/>\n'; // FIXME: use xt:head label
    }
  },
  // DEPRECATED ?
  close : function () { } 
}
// file: axel/src/core/defaultbrowser.js
/* ***** BEGIN LICENSE BLOCK *****
 *
 * @COPYRIGHT@
 *
 * This file is part of the Adaptable XML Editing Library (AXEL), version @VERSION@ 
 *
 * @LICENSE@
 *
 * Web site : http://media.epfl.ch/Templates/
 * 
 * Author(s) : Stephane Sire, Antoine Yersin, Jonathan Wafellman 
 * 
 * ***** END LICENSE BLOCK ***** */

/*****************************************************************************\
|                                                                             |
|  xtdom, xtiger.cross, xtiger.util modules                                   |
|                                                                             |
|  Low level utility functions                                                |
|                                                                             |
|*****************************************************************************|
|  Some of these functions are browser dependent in which case this file      |
|  defines the non IE version, see iebrowser.js for the IE version            |
|                                                                             |
|  See also dom.js                                                            |
|                                                                             |
\*****************************************************************************/

// user agent detection
xtiger.cross.UA = {
  IE:   !!(window.attachEvent && navigator.userAgent.indexOf('Opera') === -1),
  opera:  navigator.userAgent.indexOf('Opera') > -1,
  webKit: navigator.userAgent.indexOf('AppleWebKit/') > -1,
  gecko:  navigator.userAgent.indexOf('Gecko') > -1 && navigator.userAgent.indexOf('KHTML') === -1,
  mobileSafari: !!navigator.userAgent.match(/Apple.*Mobile.*Safari/)  
};

xtiger.cross.events = {
  DOWN: (window.Modernizr && window.Modernizr.touch) ? 'touchstart' : 'mousedown'
};

if (! (xtiger.cross.UA.gecko || xtiger.cross.UA.webKit || xtiger.cross.UA.IE || xtiger.cross.UA.opera ||  xtiger.cross.UA.mobileSafari)) {
  xtiger.cross.log ('warning', 'XTiger Forms could not detect user agent name, assuming a Gecko like browser');
  xtiger.cross.UA.gecko = true;
}

xtiger.util.countProperties = function (o) {
  var total = 0, k;
  for (k in o) if (o.hasOwnProperty(k))  total++;
  return total;
}

// Two utility functions to encode/decode XML entities
xtiger.util.encodeEntities = function (s) {
  if (typeof(s) != "string") { // FIXME: isn't it too costly here ?
    // maybe it's a number
    return s; 
  }
  var res = s;
  if (s.indexOf('&') != -1) {
    res = res.replace(/&(?![a-zA-Z]{3,5};)/g, '&amp;'); // Avoid double encoding
  }
  if (s.indexOf('<') != -1) {        
    res = res.replace(/</g, '&lt;');  
  } 
  if (s.indexOf('>') != -1) {        
    res = res.replace(/>/g, '&gt;');  
  } 
  return res;
}
              
// Not used yet because it seems the native XML parser converts entities on the fly when loading an XML document
// (at least on FireFox)
xtiger.util.decodeEntities = function (s) {
  if (s.indexOf('&amp;') != -1) {
    var res = s.replace(/&amp;/g, '&');
    if (s.indexOf('<') != -1) {
      return res.replace(/&lt;/g, '<'); 
    }                                   
    return res;
  }
  return s;
}

/**
 * Parses the "param" attribute of &lt;xt:use&gt; elements. It stores the
 * parsing results in the provided hash.
 * 
 * @param {string}
 *            aString The string content of the "param" attribute
 * @param {object}
 *            aParams A hash where to store the parsed results
 */
xtiger.util.decodeParameters = function (aString, aParams) {
  if (!aString)
    return;
  var _tokens = aString.split(';');
  for (var _i = 0; _i < _tokens.length; _i++) {
    var pos =  _tokens[_i].indexOf('=');
    if (pos > 0) {
      var _parsedTok = _tokens[_i].substr(0, pos);
      var _key = _parsedTok.replace(/^\s+/, '').replace(/\s+$/, ''); // Trim    
      if (_key.length > 0) {
        if (_key == 'class') { // pb with 'class' key in js on Safari
          _key = 'hasClass';
        }
        aParams[_key] = _tokens[_i].substr(pos + 1).replace(/^\s+/, '').replace(/\s+$/, '');        
        }
      } // FIXME: raise a warning (?)
  }
}

/**
 * Implements the "map" feature for arrays.
 * 
 * This function does not affect the given array. It returns a freshly created one.
 */
xtiger.util.array_map = function array_map (aArray, aCallback) {
  if (! (typeof aArray == 'object' && typeof aCallback == 'function'))
    return aArray;
  var _buf = [];
  for (var _i = 0; _i < aArray.length; _i++) {
    _buf[_i] = aCallback(aArray[_i]);
  }
  return _buf;
}

/**
 * Implements the "filter" feature for arrays. Returns an array whose elements
 * are on the given array AND satisfies the given predicate.
 * 
 * This function does not affect the given array. It returns a freshly created one.
 * 
 * @param {[any]}
 *            An array to filter
 * @param {function(any)}
 *            A function taking a value from the array and returning a boolean
 * @return {[any]} A new array containing elements from the given array that
 *         match the predicate
 */
xtiger.util.array_filter = function array_filter (aArray, aCallback) {
  if (! (typeof aArray == 'object' && typeof aCallback == 'function'))
    return aArray;
  var _buf = [];
  for (var _i = 0; _i < aArray.length; _i++) {
    if (aCallback(aArray[_i]))
      _buf.push(aArray[_i]);
  }
  return _buf;
}

//////////////////
// xtiger.cross //
//////////////////

/**
 * Returns an XMLHTTPRequest object depending on the platform.
 * Returns false and displays an alert if it fails to create one 
 */
xtiger.cross.getXHRObject = function () {
  var xhr = false;  
  if (window.XMLHttpRequest) {
     xhr = new XMLHttpRequest();
  } else if (window.ActiveXObject) {  // IE
    try {
      xhr = new ActiveXObject('Msxml2.XMLHTTP');
    } catch (e) {
      try {   
        xhr = new ActiveXObject('Microsoft.XMLHTTP');  
      } catch (e) {
      }
    }
  }
  if (! xhr) {
     alert("Your browser does not support XMLHTTPRequest");
  }
  return xhr;       
}                  
          
/**
 * Loads the document at URL using the default XHR object created by the getXHRObject method
 * Accepts an optional logger (xtiger.util.Logger) object to report errors
 * Returns the document (should be a DOM Document object) or false in case of error
 */
xtiger.cross.loadDocument = function (url, logger) {
  var xhr = xtiger.cross.getXHRObject ();
  try {  
    xhr.open("GET", url, false); // false:synchronous
    xhr.send(null);
    if ((xhr.status  == 200) || (xhr.status  == 0)) { // 0 is for loading from local file system
      if (xhr.responseXML) {
        return xhr.responseXML;     
        // FIXME: on FF we must test for parseerror root and first child text node err msg !!!!
      } else if (logger) {
        logger.logError('$$$ loaded but it contains no XML data', url);
      }
    } else if (logger) { 
      var explain = xhr.statusText ? '(' + xhr.statusText + ')' : ''; 
      logger.logError('HTTP error while loading $$$, status code : ' + xhr.status + explain, url);
    }
  } catch (e) {        
    if (logger) { logger.logError('Exception while loading $$$ : ' + (e.message ? e.message : e.name), url); }
  } 
  return false; 
}

/**
 * Logs its arguments separated by a space.
 */
xtiger.cross.log = function  (channel, msg) {
  switch (channel) {
  case 'error' :
  case 'fatal' :
    xtiger.cross.print('[XX] ' + msg);
    break;
  case 'warning' :
    xtiger.cross.print('[!!] ' + msg);
    break;
  case 'info' :
    //xtiger.cross.print('[ii] ' + msg);
    break;
  case 'debug' :
    xtiger.cross.print('[dd] ' + msg);
    break;
  case 'stack-trace' :
    xtiger.cross.print('[tt] ' + msg);
    break;
  default :
    //xtiger.cross.print('[' + channel + '] ' + msg);
  }
}

/**
 * Prints an output on the browser's console, if any
 */
xtiger.cross.print = function (aMessage) {
  try {
    if (typeof(opera) != 'undefined' && opera.log) {
      opera.postError(aMessage);
    }
    else if (typeof(console) != 'undefined') {
      if (/^\[!!\]/.test(aMessage) && console.warn)
        console.warn(aMessage);
      else if (/^\[XX\]/.test(aMessage) && console.error)
        console.error(aMessage);
      else if (console.log)
        console.log(aMessage);
    }
    else if (typeof(window.console) != 'undefined' && window.console.log) {
      window.console.log (aMessage);
    }
    /*else
      alert(aMessage);*/ // Only if debugging
  } catch (_err) {
    alert(aMessage + "\nUnable to print on console (" + _err.message + ")"); 
  }
}

/**
 * Factory function that creates a minimal DOMParser object for parsing XML string
 * into DOM objects (to be used as data sources).
 * @function xtiger.cross.makeDOMParser
 */
// DOMParser is currently used only to load data in a data source from a String
if (typeof DOMParser == "undefined") {
  
  xtiger.util.DOMParser = function () {};
  
  xtiger.util.DOMParser.prototype.parseFromString = function (str, contentType) {
    if (typeof ActiveXObject != "undefined") {
      var d = new ActiveXObject("MSXML.DomDocument");
      d.loadXML(str);
      return d;
    } else if (typeof XMLHttpRequest != "undefined") {
      // FIXME: with FF 3.0.5 this raises an exception (access to restricted URI)
      // because data: URI scheme is considered as a cross browser attempt to read a file
      var req = new XMLHttpRequest;
      req.open("GET", "data:" + (contentType || "application/xml") +
                      ";charset=utf-8," + encodeURIComponent(str), false);
      if (req.overrideMimeType) {
         req.overrideMimeType(contentType);
      }
      req.send(null);
      return req.responseXML;
    }
  }       
  xtiger.cross.makeDOMParser = function () {
    return new xtiger.util.DOMParser();
  }     
  
} else {
  xtiger.cross.makeDOMParser = function () {
    return new DOMParser();
  }
}

/**
 * Factory function that creates and returns a new TreeWalker object.
 * @function xtiger.cross.makeTreeWalker
 */
if (! document.createTreeWalker) {  
// if (true) {  
  xtiger.util.TreeWalker =
    function (node, nodeType, filter){
      this.nodeList = new Array();
      this.nodeType = nodeType;
      this.filter = filter;
      this.nodeIndex = -1;
      this.currentNode = null;      
      this.findNodes(node);
    }   
    
  xtiger.util.TreeWalker.prototype = {
    nextNode:function(){
      this.nodeIndex += 1;
      if(this.nodeIndex < this.nodeList.length){
        this.currentNode = this.nodeList[this.nodeIndex];
        return true;
      }else{
        this.nodeIndex = -1;
        return false;
      }
    },
    
    findNodes:function(node){
      if( node.nodeType == this.nodeType && this.filter(node)== xtdom.NodeFilter.FILTER_ACCEPT ){
        this.nodeList.push(node);
      }
      if(node.nodeType == 1 ){
        for(var i = 0; i<node.childNodes.length; i++){
          this.findNodes(node.childNodes[i]);
        }
      }
    }
  }
  
  xtiger.cross.makeTreeWalker =
    function (n, type, filter) { return new xtiger.util.TreeWalker(n, type, filter) }
} else {
  xtiger.cross.makeTreeWalker =
    function (n, type, filter) { filter.acceptNode = filter; return n.ownerDocument.createTreeWalker(n, type, filter, false) }
  // see http://stackoverflow.com/questions/5982648/recommendations-for-working-around-ie9-treewalker-filter-bug
}  

/**
 * Returns the XTiger type of a DOM node. Returns xtiger.UNKNOWN otherwise.
 * Pre-condition: the node must be an Element node.
 * FIXME: do browser dependent version trully using namespace DOM API to void setting prefixes in marble  
 */
xtdom.getNodeTypeXT = function (aNode) {
  // FIXME: depends on namespace prefix on FF 
  var s = aNode.nodeName.toLowerCase(); // localName not defined for IE
  if ((s == 'use') || (s == 'xt:use')) {
    return xtiger.USE;
  } else if ((s == 'component') || (s == 'xt:component')) {
    return xtiger.COMPONENT;
  } else if ((s == 'repeat') || (s == 'xt:repeat')) {
    return xtiger.REPEAT;
  } else if ((s == 'bag') || (s == 'xt:bag')) {
    return xtiger.BAG;
  } else if ((s == 'attribute') || (s == 'xt:attribute')) {
    return xtiger.ATTRIBUTE;
  // } else if ((s == 'menu-marker') || (s == 'xt:menu-marker')) { {
  //  return xtiger.MENU_MARKER;
  } else {
    return xtiger.UNKNOWN;
  }
}

/////////////////////
// A few constants //
/////////////////////

xtdom.ELEMENT_NODE = 1;
xtdom.ATTRIBUTE_NODE = 2;
xtdom.TEXT_NODE = 3;
xtdom.CDATA_SECTION_NODE = 4;
xtdom.COMMENT_NODE = 8

if ((typeof NodeFilter == "undefined") || !NodeFilter) {
  xtdom.NodeFilter = {
    SHOW_ELEMENT : 1,
    FILTER_ACCEPT : 1,
    FILTER_SKIP : 3 
  } 
} else {
  xtdom.NodeFilter = {
    SHOW_ELEMENT : NodeFilter.SHOW_ELEMENT,
    FILTER_ACCEPT : NodeFilter.FILTER_ACCEPT,
    FILTER_SKIP : NodeFilter.FILTER_SKIP
  }
}

/**
 * Returns the DOM window object for a given document. if the document is within
 * an iframe, returns the frame's window object.
 * 
 * @param aDocument
 * @return
 */
xtdom.getWindow = function getWindow (aDocument) {
  if (window.document == aDocument)
    return window;
  if (window.frames.length > 0) {
    for (var _i = 0; _i < window.frames.length; _i++) {
      if (window.frames[_i].document == aDocument)
        return window.frames[_i];
    }
  }
  xtiger.cross.log('warning', 'The window object was not found.');
  return window;
}

// No-IE browser methods
if (! xtiger.cross.UA.IE) {

  // Returns true if the node is an XTiger node
  xtdom.isXT = function isXT (node) {
    var ns = node.namespaceURI;
    return (ns == xtiger.parser.nsXTiger) || (ns == xtiger.parser.nsXTiger_deprecated);
  } 
  
  // Returns true if the DOM is a xt:use node, false otherwise.
  xtdom.isUseXT = function isUseX (aNode) { 
    // FIXME: depends on namespace prefix on FF + should we lowercase nodeName ?
    return (aNode.nodeName == 'use' || aNode.nodeName == 'xt:use');
  }

  // Returns true if the DOM is a xt:bag node, false otherwise.
  xtdom.isBagXT = function (aNode) {  
    // FIXME: depends on namespace prefix on FF + should we lowercase nodeName ?
    return (aNode.nodeName == 'bag' || aNode.nodeName == 'xt:bag');
  }

  xtdom.getElementsByTagNameXT = function (container, name) { 
    // FIXME: depends on namespace prefix on FF   
    var res = container.getElementsByTagName(name);
    if (0 == res.length) {
      res = container.getElementsByTagName('xt:' + name);
    } 
    return res;
  }

  // Returns the local node of a node (without namespace prefix)
  xtdom.getLocalName = function (node) {
    return node.localName; // otherwise nodeName includes "prefix:"
  }
  
  xtdom.getTextContent = function (aNode) {
    if (aNode.textContent)
      return aNode.textContent;
    else if (aNode.text)
      return aNode.text;
    else
      return '';
  }
    
  xtdom.createElement = function (doc, tagName) {
    // there may be some issues with massive default attribute creation on IE ?
    //  return doc.createElement(tagName);
    return doc.createElementNS("http://www.w3.org/1999/xhtml", tagName);
  };

  xtdom.createElementNS = function (doc, tagName, ns) {
    return doc.createElementNS(ns, tagName);
  };
    
  xtdom.importNode = function (doc, node, deep) {
    return doc.importNode (node, deep);
  }
  
  xtdom.cloneNode = function (doc, node, deep) {
    // FIXME: shall we check if (node.ownerDocument == doc) to import the node instead of cloning
    return node.cloneNode (deep);
  } 
    
  xtdom.setAttribute = function(node, name ,value){
    node.setAttribute(name, value);
  }
  
  xtdom.getStyleAttribute = function (aNode) {
    return aNode.getAttribute('style');
  }
  
  xtdom.getEventTarget = function (ev) {
    return ev.target;
  } 

  xtdom.addEventListener = function (node, type, listener, useCapture){
    node.addEventListener(type, listener, useCapture);
  }

  xtdom.removeEventListener = function (node, type, listener, useCapture) {
    node.removeEventListener(type, listener, useCapture);
  } 

  xtdom.removeAllEvents = function (node) {
    alert ('removeAllEvents should not be called on this browser')
  }
  
  xtdom.preventDefault = function (aEvent) {
    aEvent.preventDefault();
  }
  
  xtdom.stopPropagation = function (aEvent) {
    aEvent.stopPropagation();
  }           
                         
  xtdom.focusAndSelect = function (aField) {
    try {
      aField.focus(); // not sure: for Safari focus must preceed select
      aField.select(); // variant: setSelectionRange(0, aField.value.length); 
    } // FIXME: iPad ?
    catch (e) {}
  }

  xtdom.focusAndMoveCaretTo = function (aField, aPos) {
    try {
      aField.focus();
      if (aField.setSelectionRange) {
        aField.setSelectionRange(aPos, aPos);
      }
    }
    catch (e) {}
  }

} // else REMEMBER TO INCLUDE iebrowser.js !


// file: axel/src/core/iebrowser.js
/* ***** BEGIN LICENSE BLOCK *****
 *
 * @COPYRIGHT@
 *
 * This file is part of the Adaptable XML Editing Library (AXEL), version @VERSION@ 
 *
 * @LICENSE@
 *
 * Web site : http://media.epfl.ch/Templates/
 * 
 * Author(s) : Stephane Sire, Jonathan Wafellman
 * 
 * ***** END LICENSE BLOCK ***** */

// Additional file to include for running on IE browser

if (xtiger.cross.UA.IE) {
  
  xtdom.hasAttribute = function (node, name) {
    return node.getAttribute(name) != null;
  }
  
  xtdom.isXT = function (node) {
    return xtiger.parser.isXTigerName.test(node.nodeName);
  } 
  
  // Returns true if the DOM is a xt:use node, false otherwise.
  xtdom.isUseXT = function (aNode) {  
    var n = aNode.nodeName.toUpperCase();
    return (n === 'USE' || n === 'XT:USE');
  }

  // Returns true if the DOM is a xt:bag node, false otherwise.
  xtdom.isBagXT = function (aNode) {  
    var n = aNode.nodeName.toUpperCase();
    return (n === 'BAG' || n === 'XT:BAG');
  }

  xtdom.getElementsByTagNameXT = function (container, name) { 
    var res = container.getElementsByTagName(name);
    if (0 == res.length) {
      res = container.getElementsByTagName('xt:' + name);
    } 
    return res;
  } 

  xtdom.getLocalName = function (node) {
    return node.nodeName;  // FIXME: check that IE do not keep "prefix:"
  }

  xtdom.getTextContent = function (aNode) {
    if (aNode.innerText)
      return aNode.innerText;
    else if (aNode.text)
      return aNode.text;
    else
      return '';
  }
  
  xtdom.createElement = function (doc, tagName) {
    // there may be some issues with massive default attribute creation on IE ?
    return doc.createElement(tagName);
  }
  
  xtdom.createElementNS = function (doc, tagName, ns) {
    if (ns == xtiger.parser.nsXTiger) {
      return doc.createElement('xt:' + tagName);
    } else {
      return doc.createElement(ns + ':' + tagName);
    }   
  }
  
  // see http://www.alistapart.com/articles/crossbrowserscripting
  xtdom.importNode = function(doc, node, deep) {  
    var copy;
    switch (node.nodeType) {
      case xtdom.ELEMENT_NODE:                                  
        // remove prefix from node name as in my last attempt with IE8 appendChild 
        // threw an exception with the node created with a prefixed name
        var nspos = node.nodeName.indexOf(':');
        var nodeName = (nspos == -1) ? node.nodeName : node.nodeName.substr(nspos + 1);
        var newNode = xtdom.createElement(doc, nodeName);
        // copy attributes                
        if (node.attributes && node.attributes.length > 0) 
          for (var i = 0; i < node.attributes.length; i++)
            xtdom.setAttribute(newNode, node.attributes[i].name, node.attributes[i].value);
        if (deep && node.childNodes && node.childNodes.length > 0) // copy children (recursion)
          for (var i = 0; i < node.childNodes.length; i++) {
            copy = xtdom.importNode(doc, node.childNodes[i], deep);
            if (copy) newNode.appendChild(copy);
          }
        return newNode;
        break;
      case xtdom.TEXT_NODE:
      case xtdom.CDATA_SECTION_NODE:
        return xtdom.createTextNode(doc, node.nodeValue);
        break;                                           
      case xtdom.COMMENT_NODE: // skip comment nodes
        break;                                           
    }
  }   
  
  xtdom.cloneNode = function (doc, node, deep) {
    // FIXME: shall we check if(node.ownerDocument == this.doc)
    var clone = node.cloneNode (deep);
    xtdom.removeAllEvents(clone); // IE do also clone event handlers
    return clone;
  } 

  // this is called at least from importNode
  xtdom.setAttribute = function(node, name ,value) {
    if (name == 'class') {
      node.className = value;
    } else {
      node.setAttribute(name, value);
    }
  }
  
  // Fixes the mess around the style attribute in IE
  xtdom.getStyleAttribute = function (aNode) {
    if (aNode.style)
      return aNode.style.cssText;
    else if (aNode.attributes[0] && aNode.attributes[0].nodeName == 'style') {
      return aNode.attributes[0].nodeValue;
    }
  }

  // ev.srcElement replaces window.event.srcElement since IE8
  xtdom.getEventTarget = function (ev) {
    return (ev && ev.srcElement) ? ev.srcElement : window.event.srcElement;
  }
  
  /**
  * Attach an event to the given node
  *, WARNING : cannot capture events on IE, events only bubble
  */
  xtdom.addEventListener = function (node, type, listener, useCapture) {
    node.attachEvent('on' + type, listener);
    // node.addEventListener(type, listener, useCapture);   
    if (! node.events) {
      node.events = new Array();
    }
    node.events.push ([type,listener]);
  } 

  xtdom.removeEventListener = function (node, type, listener, useCapture) {
    node.detachEvent('on' + type, listener);
    // node.removeEventListener(type, listener, useCapture);    
    // FIXME: remove [type,listener] from node.events (?)
  }     

  xtdom.removeAllEvents = function (node) {
    if (node.events) {
      for(var i = 0; i < node.events.length; i++){
        xtdom.removeEventListener (node, node.events[i][0], node.events[i][1], true);       
      }
      node.events = new Array();
    }
  }

  xtdom.preventDefault = function (aEvent) {
    aEvent.returnValue = false;
  }
  
  xtdom.stopPropagation = function (aEvent) {
    aEvent.cancelBubble = true;
  }     
  
  xtdom.focusAndSelect = function (aField) {
    try { // focusing a hidden input causes an error (IE)
      aField.focus();
      var oRange = aField.createTextRange(); 
      oRange.moveStart("character", 0); 
      oRange.moveEnd("character", aField.value.length); 
      oRange.select();    
    }        
    catch (e) {}
  }           
                        
  // FIXME: currently moves caret to the end of aField
  xtdom.focusAndMoveCaretTo = function (aField, aPos) {
    try {
      aField.focus();
      var oRange = aField.createTextRange(); 
      oRange.collapse(false); // move caret to end
      oRange.select();
    }   
    catch (e) {}
  } 

}

// file: axel/src/core/parser.js
/* ***** BEGIN LICENSE BLOCK *****
 *
 * @COPYRIGHT@
 *
 * This file is part of the Adaptable XML Editing Library (AXEL), version @VERSION@ 
 *
 * @LICENSE@
 *
 * Web site : http://media.epfl.ch/Templates/
 * 
 * Author(s) : Stephane Sire, Jonathan Wafellman
 * 
 * ***** END LICENSE BLOCK ***** */

/*
 * Global Constants for the XTiger Template parser
 */

xtiger.parser.NATIVE = 0;
xtiger.parser.CONSTRUCTED = 1;

// RegExps
xtiger.parser.nsXTiger = "http://ns.inria.org/xtiger";
xtiger.parser.nsXTiger_deprecated = "http://wam.inrialpes.fr/xtiger"; // deprecated ns
xtiger.parser.nsXHTML = "http://www.w3.org/1999/xhtml"
xtiger.parser.isXTiger = /<[^>]*[(component)(use)(repeat)(service)]/i; // XTiger node opening tag
xtiger.parser.isXTigerName = /[(component)(use)(repeat)(service)]/i; // XTiger node name

/**
 * Represents the tree of each component inside the XTiger file to visualize
 * NATIVE components correspond to the XTiger builtin types 'string', 'number' and 'boolean'
 * or to the target language elements filtered (declared with "xtt:targetElements")
 */
xtiger.parser.Component = function (nature, tree) {
  this.nature = nature;
  this.tree = tree;
  this.str =  null;
}

xtiger.parser.Component.prototype = {
  
  isNative : function () {
    return (xtiger.parser.NATIVE == this.nature);
  },

  hasBeenExpanded : function () {
    return (xtiger.parser.NATIVE == this.nature) || (this.str != null);
  },
  
  getSource : function () {
    if (! this.str) {
      this.str = this.tree.innerHTML;
    }
    return this.str;
  },
  
  getTree : function () {
    return this.tree;
  },
  
  getClone : function (doc) {
    var res = xtdom.cloneNode (doc, this.tree, true);
    return res;
  },
  
  importStructTo : function (targetDoc) {
    var copy = xtdom.importNode (targetDoc, this.tree, true);
    this.tree = copy;
  }
  
}

/**
 * Creates an iterator to transform the XTiger template document passed as parameter 
 * with the transformer instance
 */
xtiger.parser.Iterator = function (doc, transformer) {  
  this.transformer = transformer;
  this.unionList = new Object(); // type list of the union. any, anyElement, anyComponent, anySimple
  this.componentLib = new Object(); // parsed XTiger components
  this.transformer.coupleWithIterator (this);
  this.acquireComponentStructs (doc); // parses XTiger components
  this.acquireUnion (doc); // resolves the union types
  this.acquireHeadLabel (doc); // xt:head label
} 

xtiger.parser.Iterator.prototype = {
      
  /**************************************************/
  /*                                                */
  /*         Components acquisition methods         */
  /*                                                */
  /**************************************************/   
  
  hasType : function (name) {
    return this.componentLib[name] ? true : false;
  },

  defineType : function (name, definition) {
    this.componentLib[name] = definition;
  },
  
  defineUnion : function (name, definition) {
    this.unionList[name] = definition;
  },
  
  getComponentForType : function (name) {
    return this.componentLib[name];
  },
  
  acquireHeadLabel : function (aDocument) {
    var l;
    var head = xtdom.getElementsByTagNameXT (aDocument, "head");    
    if (head && (head.length > 0)) {
       l = head[0].getAttributeNode('label');
       if (! l) { // FIXME : most probably xtdom.getElementsByTagNameXT returned the XHTML head
        head = xtdom.getElementsByTagNameXT (head[0], "head");
        if (head && (head.length > 0)) {
          l = head[0].getAttributeNode('label');
        }
      }
    }
    this.headLabel = l ? l.value : undefined;
  },

  // Creates a memory structure for each XTiger component defined in its parameter aDocument
  // aDocument must contain an XTiger document tree
  acquireComponentStructs : function (aDocument) {
    var structs = xtdom.getElementsByTagNameXT (aDocument, "component");
    var mapTypes = new Array();
    for(var inc = 0; inc< structs.length; inc++) {
      var name = structs[inc].getAttribute('name');
      // var name = structs[inc].getAttributeNode('name').value;
      if (name) {
        mapTypes.push(name);
        this.componentLib[name] = new xtiger.parser.Component (xtiger.parser.CONSTRUCTED, structs[inc]);
      }
    } 
    this.unionList['anyComponent'] = mapTypes;
  },

  // Acquires complex types and sets them in the object
  acquireUnion : function (template) {
    var unions = xtdom.getElementsByTagNameXT (template, "union");    
    for (var inc = 0; inc < unions.length; inc++) {
      var tmp;
      var name = unions[inc].getAttributeNode('name').value; // FIXME: exception handling
      // 1. extracts and develop types to include (mandatory)
      tmp = unions[inc].getAttributeNode('include').value.split(" "); // FIXME: exception handling
      var typeIn = this.flattenUnionTypes(tmp);
      var typeString = " " + typeIn.join(" ") + " "; //  protects names with spaces for RegExp matching
      // 2. extracts and develop types to exclude and exclude them (optional)
      tmp = unions[inc].getAttributeNode('exclude');      
      if (tmp) {
        tmp = typeDel.value.split(" ");
        var typeDel = this.flattenUnionTypes(tmp);
        for (var inc2 = 0; inc2< typeDel.length; inc2++) {
          typeString = typeString.replace(new RegExp(" " + typeDel[inc2] + " "), " ");
        }
      }
      typeString = typeString.substring(1,typeString.length-1); // trims spaces
      this.unionList[name] = typeString.split(" ");     
    }
    // completes with the type "any"
    this.unionList["any"] = this.unionList["anySimple"].concat(this.unionList["anyElement"], this.unionList["anyComponent"]);
  },
  
  // Transforms a list of types into a list of simple types where all the union types have been flattened
  // into their corresponding simple types.
  // types is an array of strings that represent the type names
  flattenUnionTypes : function (types) {
    // FIXME: optimize it with lazy creation of a new array (output)
    var output = [];
    for (var inc = 0; inc < types.length; inc ++) {
      if (this.unionList[types[inc]] != null) { // checks if the type is itself a union
        var thisUnion = this.unionList[types[inc]]; // develops it    
        for (var i = 0; i < thisUnion.length; i++) {
          output.push(thisUnion[i]);
        }     
      } else {
        output.push(types[inc]); // keeps it
      }
    }
    return output;
  },  
  
  // Imports all the component definitions into the document targetDoc
  // This is a pre-requisite before transforming targetDoc sub-parts.
  importComponentStructs : function (targetDoc) { 
    xtiger.cross.log('info', 'imports template component structures to target document');
    for (var k in this.componentLib) {
      this.componentLib[k].importStructTo (targetDoc);
    }
  },
    
  /***********************************************************/
  /*                                                         */
  /*  XTiger template tree transformation to XHTML methods   */
  /*                                                         */
  /***********************************************************/

  /** 
   * Transforms an XTiger template source document
   * aNode is the root node from where the transformation starts
   * DOC is document that will be transformed
   */
  transform : function (aNode, doc) {
    this.curDoc = doc;
    this.transformer.prepareForIteration (this, doc, this.headLabel);
    this.transformIter (aNode);
    this.transformer.finishTransformation (aNode);
  },
    
  transformIter : function (aNode) {    
    if (aNode.nodeType == xtdom.ELEMENT_NODE) { // only operates on element nodes, if not, keep it unchanged
      var type = xtdom.getNodeTypeXT(aNode);  
      if (xtiger.COMPONENT == type) {
        this.changeComponent(aNode);        
      } else {
        this.transformer.saveContext (aNode); // FIXME: aNode.tagName for default case ?
        switch (type) {
          case xtiger.USE: 
            this.changeUse(aNode);
            break;
          case xtiger.REPEAT:
            this.changeRepeat(aNode);
            break;
          case xtiger.ATTRIBUTE:
            this.changeAttribute(aNode); 
            break;   
          case xtiger.BAG:
            this.changeBag(aNode); 
            break;
          default:
            this.continueWithChildOf(aNode);
        }      
        this.transformer.restoreContext (aNode);
      }
    }
  },      
    
  /*
  Iterates on the children of the node passed as parameter to transform it for presentation:
  - for children sub-trees that contain some Xtiger nodes, continue transformation by calling transform
  - ignores the other children
  Two passes algorithm because calls to transform may change the structure of the tree while iterating
  */
  continueWithChildOf : function (aNode) {
    var process = new Array();
    for (var i = 0; i < aNode.childNodes.length; i++) { 
      if (xtdom.containsXT(aNode.childNodes[i])) {
          process.push (aNode.childNodes[i]);
      }
    }
    this.transformItems (process);
  },
  
  // The accumulated nodes can be:
  // - either a simple list of nodes (DOM nodes that contain some XTiger at some point) to transform
  // - or a list starting with 'OPAQUE', in that case the following elements represent the current type
  //   which is beeing expanded, each element (cur) is an opaque structure (known only by the transformer) 
  //   and hence each node must be retrieved with getNodeFromOpaqueContext (cur)
  // Note that when iterating on an opaque list of nodes, the top of the context is removed first 
  // and restored at the end. Then, each iteration saves a new element on top of the context,   
  // setting a true flag on the saveContext / restoreContext calls to indicate this is the result of an 
  // opaque iteration
  transformItems : function (nodes) {
    if (nodes.length == 0)  return; // nothing to transform
    var cur;    
    if (nodes[0] == 'OPAQUE') { // special iteration caused by "types" expansion
      nodes.shift();
      var saved = this.transformer.popContext (); // removes the top context (xt:use or xt:bag)
      while (cur = nodes.shift()) { 
        this.transformer.saveContext (cur, true); // set top context to the current expanded type
        this.transformIter(this.transformer.getNodeFromOpaqueContext(cur));
        this.transformer.restoreContext(cur, true);
      }
      this.transformer.pushContext(saved); // continue as before      
    } else {
      while (cur = nodes.shift()) { 
        this.transformIter(cur);
      }
    }
  },

  // Transformation of a component element
  changeComponent : function (componentNode) {
    var accu = [];
    var container = xtdom.createElement(this.curDoc, 'div');
    this.transformer.genComponentBody (componentNode, container);
    this.transformer.genComponentContent (componentNode, container, accu);
    this.transformItems (accu);
    this.transformer.finishComponentGeneration (componentNode, container);
    xtdom.replaceNodeByChildOf (componentNode, container);    
  },

  // Transformation of a repeat element
  changeRepeat : function (repeatNode) {
    var accu = [];
    var container = xtdom.createElement(this.curDoc, 'div');
    this.transformer.genRepeatBody (repeatNode, container, accu);
    this.transformer.genRepeatContent (repeatNode, container, accu);
    this.transformItems (accu);
    this.transformer.finishRepeatGeneration (repeatNode, container);
    xtdom.replaceNodeByChildOf (repeatNode, container);
  },

  // Generation for xt:use and xt:use with option flag
  changeUse : function (xtSrcNode) {  
    var accu = [];        
    var container = xtdom.createElement(this.curDoc,'div');
    var kind = 'use'; 
    // creates an array that contains all the types of the use element      
    var types = xtSrcNode.getAttribute('types').split(" ");
    types = this.flattenUnionTypes(types);  
    this.transformer.genIteratedTypeBody (kind, xtSrcNode, container, types);
    this.transformer.genIteratedTypeContent (kind, xtSrcNode, container, accu, types);
    this.transformItems (accu);   
    this.transformer.finishIteratedTypeGeneration (kind, xtSrcNode, container, types);
    xtdom.replaceNodeByChildOf (xtSrcNode, container);
  }, 
  
  // Generation for xt:attribute
  changeAttribute : function (xtSrcNode) {  
    var accu = null; // not used for attribute that MUST resolve to a single type
    var container = xtdom.createElement(this.curDoc,'div');
    var kind = 'attribute';
    var types = [xtSrcNode.getAttribute('types') || xtSrcNode.getAttribute('type')]; // attributes have a single type, "type" is deprecated 
    this.transformer.genIteratedTypeBody (kind, xtSrcNode, container, types);
    this.transformer.genIteratedTypeContent (kind, xtSrcNode, container, accu, types);
    this.transformer.finishIteratedTypeGeneration (kind, xtSrcNode, container, types);
    xtdom.replaceNodeByChildOf (xtSrcNode, container);
  },   

  // Since the bag element is part of XTiger but not currently supported by AXEL
  // It is replaced with an "unsupported" span element in the DOM
  // Previous versions of AXEL (up to Revision 165) converted the bag to a use with multiple choices
  changeBag : function (bagNode) {       
    var span = xtdom.createElement(this.curDoc, 'span');
    xtdom.addClassName(span, 'axel-generator-error');
    var t = xtdom.createTextNode(this.curDoc, '! unsupported Bag element !');
    span.appendChild(t);      
    bagNode.parentNode.insertBefore(span, bagNode, true);
    bagNode.parentNode.removeChild(bagNode);
  }
}

// file: axel/src/core/forms.js
/* ***** BEGIN LICENSE BLOCK *****
 *
 * @COPYRIGHT@
 *
 * This file is part of the Adaptable XML Editing Library (AXEL), version @VERSION@ 
 *
 * @LICENSE@
 *
 * Web site : http://media.epfl.ch/Templates/
 * 
 * Author(s) : Stephane Sire
 * 
 * ***** END LICENSE BLOCK ***** */
 
/*****************************************************************************\
|                                                                             |
|  xtiger.util.Logger module                                                  |
|                                                                             |
|  A logger for keeping error messages while performing error-prone actions   |
|  xtiger.util.Form uses it as an optional parameter to report errors         |
|                                                                             |
|*****************************************************************************|
|  NOTE: we most probably will deprecate this and use exceptions instead)     |
|                                                                             |
\*****************************************************************************/

xtiger.util.Logger = function () {
 this.errors = [];
}

xtiger.util.Logger.prototype = {

 // Returns true if the logger has recorded some error message
 inError : function () {
   return (this.errors.length > 0);
 },

 // If msg contains '$$$', it will be substituted with the file name contained in optional url
 logError : function (msg, url) {
   if (msg.indexOf('$$$') != -1) {
     var m = url.match(/([^\/]*)$/); // should extract trailing file name
     var name = m ? m[1] : url;
     this.errors.push (msg.replace('$$$', '"' + name + '"'));
   } else {
     this.errors.push (msg);
   }
 },

 // Returns a concatenation of error messages
 printErrors : function () {
   return this.errors.join(';');
 }
}

 /*****************************************************************************\
 |                                                                             |
 |  xtiger.util.Form module                                                    |
 |                                                                             |
 |  WILL BE DEPRECATED - use $axel wrapper object instead                      |
 |                                                                             |
 |  Class for calling AXEL parser and generator to transform a template into   |
 |  an editor, then to load and/or save XML data from/to the editor.           |
 |                                                                             |
 |*****************************************************************************|
 |  This class can be used as en entry point to AXEL                           |
 |  You may prefer to use higher-level command objects defined in AXEL-FORMS   |
 |                                                                             |
 |  Note that we will probably migrate some or all of its functionalities      |
 |  into the $axel wrapper set object                                          |
 |                                                                             |
 |                                                                             |
 \*****************************************************************************/
 
// baseIconsUrl is the path to the icons used by the generated editor
xtiger.util.Form = function (baseIconsUrl) {
  this.baseUrl = baseIconsUrl;  
  this.doTab = false;  
  this.loader = this.serializer = null;
} 

xtiger.util.Form.prototype = {

  // Internal log mechanism that keeps track of a status
  _report : function (status, str, logger) {
    this.status = status;
    this.msg = str;
    if (0 === this.status) {
      if (logger) { 
        logger.logError(str);
      } else {
        xtiger.cross.log('error', str);
      }
    }
  },   
  
  // Overrides default class XML loader object
  setLoader : function (l) {
    this.loader = l;
  },
  
  // Overrides default class XML serializer object
  setSerializer : function (s) {
    this.serializer = s;
  },

  /**
   * Enables Tab Key navigation in the generated editor.
   * This method must be called before doing the transformation.
   */
  enableTabGroupNavigation : function () {
    this.doTab = true;
  },
  
  /**
   * Sets the document that contains the Tiger template to transform.
   * xtDoc is the document object (XML DOM) that contains the template, it must 
   * also includes the head section for the declaration of components.
   * By default all the document template body will be transformed.
   * By default, if you do not call setTargetDocument, it is the template
   * that will be transformed. In that case you should also call injectStyleSheet
   * to include the form CSS style sheet into the template if it wasn't included yet
   */
  setTemplateSource : function (xtDoc, logger) {
    // FIXME: add a parameter to select a sub-part of the template to transform   
    this.srcDoc = xtDoc;
    this.srcForm = null;
    if (xtDoc) { // sanity check
      var bodies = xtDoc.getElementsByTagName('body');
      if (bodies && (bodies.length > 0)) {
        this.srcForm = bodies[0];  // sets what will be transformed
      } else {
        try { // IE Case with IXMLDOMElement document (loaded from MSXML)
          xtDoc.setProperty("SelectionNamespaces","xmlns:xhtml='http://www.w3.org/1999/xhtml'");
          this.srcForm = xtDoc.selectSingleNode('//xhtml:body');
        } catch (e) { /* nop */ }
      }     
      if (! this.srcForm) {
        this._report (0, 'Could not get <body> element from the template to transform', logger);
      }
      this.curDoc = xtDoc;
      this.targetContainerId = false;
    } else {
      this._report (0, 'The document containing the template is null or undefined', logger);
    }
    this._report (1, 'template source set', logger);
    return (this.status === 1);
  },
  
  /**
   * Sets the document where the result of the transformation will be embedded.
   * targetDoc is the target document
   * targetContainerId is the identifier of the element that will embed the result
   * doReplace is a boolean indicating if the result replaces the children of the target
   * This method should be called only if the target document is different than the 
   * template to transform.
   * If you call this method you should have included the CSS style sheet for the editor 
   * in the target document.
   */ 
  setTargetDocument : function (aDoc, anId, doReplace) {
    this.curDoc = aDoc;
    this.targetContainerId = anId;
    this.doEmptyTarget = doReplace;
  },

  setTarget : function (node, doReplace) {
    this.curDoc = node.ownerDocument;
    this.targetContainer = node;
    this.doEmptyTarget = doReplace || true;
  },
                              
  // Transforms template into editor
  // log is an optional logger to report errors
  transform : function (logger) {
    var parser;
    // FIXME: check this.srcDoc is set...
    if (! this.srcForm) {
      this._report (0, 'no template to transform', logger);
      return false;
    }
    this.editor = new xtiger.editor.Generator (this.baseUrl);
    parser = new xtiger.parser.Iterator (this.srcDoc, this.editor);
    if (this.targetContainer || this.targetContainerId) { // checks if the transformation require a cross-document copy
      var n = this.targetContainer || this.curDoc.getElementById(this.targetContainerId);
      if (n) {
        if (this.doEmptyTarget) {
          xtdom.removeChildrenOf (n);
        }
        xtdom.importChildOfInto (this.curDoc, this.srcForm, n);
        this.root = n;
      } else {
        this._report (0, 'transformation aborted because target container "' + this.targetContainerId + '" not found in target document', logger);
        return false;
      }
      parser.importComponentStructs (this.curDoc); // to import component definitions
    } else {
      this.root = this.srcForm;
    }   
    // lazy creation of keyboard manager & optional tab manager within the document session
    var kbd = xtiger.session(this.curDoc).load('keyboard');
    if (! kbd) {
      kbd = new xtiger.editor.Keyboard ();
      xtiger.session(this.curDoc).save('keyboard', kbd);
      // FIXME: someone should call removeDocument ( last document ) if this is no longer needed
      if (this.doTab) {     
        var tab = new xtiger.editor.TabGroupManager (this.root);
        kbd.setTabGroupManager(tab);
        xtiger.session(this.curDoc).save('tabgroupmgr', tab);
      }
    }
    // finally makes form available to other plugins (e.g. lens may need it to know where to insert their wrapper)
    xtiger.session(this.curDoc).save('form', this);
    parser.transform (this.root, this.curDoc);
    this._report (1, 'document transformed', logger);    
    return (this.status == 1);    
  },
  
  getEditor : function () {
    return this.editor;
  },

  getRoot : function () {
    return this.root;
  },
  
  // Call this method if you didn't include the style sheet in the document you have transformed to a form
  injectStyleSheet : function (url, logger) {
    var head = this.curDoc ? this.curDoc.getElementsByTagName('head')[0] : null;
    if (head) {
      var link = this.curDoc.createElement('link');
      link.setAttribute('rel','stylesheet');
      link.setAttribute('type', 'text/css');
      link.setAttribute('href', url); 
      head.appendChild(link);
      this._report (1, 'stylesheet injected', logger);
    } else {
      this._report (0, "cannot inject editor's style sheet because target document has no head section", logger);
    }
    return (this.status == 1);
  },   
  
  // Loads XML data into a template which has been previously loaded into a DOMDataSource
  loadData : function (dataSrc, logger) {                
    if (dataSrc.hasData()) {
      this.editor.loadData (this.root, dataSrc, this.loader);
      this._report (1, 'data loaded', logger);
    } else {
      this._report (0, 'data source empty', logger);      
    }
    return (this.status == 1);
  },
  
  // Loads XML data into a template from a string
  // DEPRECATED: use loadData instead plus initFromString to load the string into the data source
  loadDataFromString : function (str, logger) {
    var dataSource = new xtiger.util.DOMDataSource(str);
    this.loadData(dataSource, logger);
    return (this.status == 1);
  },
  
  // Dumps editor's content into a DOMLogger accumulator
  serializeData : function (accumulator) {
    this.editor.serializeData (this.root, accumulator, this.serializer);
  }
};
// file: axel/src/core/wrapper.js
/* ***** BEGIN LICENSE BLOCK *****
 *
 * @COPYRIGHT@
 *
 * This file is part of the Adaptable XML Editing Library (AXEL), version @VERSION@
 *
 * @LICENSE@
 *
 * Web site : http://media.epfl.ch/Templates/
 *
 * Author(s) : Stephane Sire
 *
 * ***** END LICENSE BLOCK ***** */

/*****************************************************************************\
|                                                                             |
|  AXEL Wrapper                                                               |
|                                                                             |
|  wrapped set function (access to primitive editors a-la jQuery)             |
|  extended with some global management functions                             |
|  exposed as GLOBAL.$axel                                                    |
|                                                                             |
|*****************************************************************************|
|                                                                             |
|  Wrapped set:                                                               |
|    $axel (node(s) | string, seethrough)                                     |
|             returns a wrapped set of primitive editor(s) within             |
|             the DOM node(s) or a string $ (jQuery) selector                 |
|             also includes unselected choice slices if seethrough is true    |
|             the string argument will be interpreted if and only if a $      |
|             function is defined                                             |
|             note that if the DOM nodes passed as argument are already       |
|             inside an unselected slice, they will be included into the      |
|             set whatever the slice is selected or not                       |
|                                                                             |
|  Global functions:                                                          |
|    extend (target, source, proto)                                           |
|             utility method to merge objects                                 |
|                                                                             |
\*****************************************************************************/
(function (GLOBAL) {

  var settings = {}; // cached $axel settings
  var MAX = 10000;
  var TOTAL;

  function _raiseError ( errMsg ) {
    if (settings.error) {
      settings.error(errMsg);
    } else {
      alert(errMsg);
    }
  }

  function _nodeIter (n, accu, seethrough) {
    if (++TOTAL > MAX) {
      xtiger.cross.log('error', 'reached iteration limit (' + MAX + ')');
      return;
    }
    if (n.xttPrimitiveEditor) {
      accu.push(n.xttPrimitiveEditor);
    }
    if (n.firstChild) {
      _sliceIter(n.firstChild, n.lastChild, accu, seethrough);
    }
  }

	// origin is optional, it is the Choice editor from where a recursive call has been initiated
  function _sliceIter (begin, end, accu, seethrough, origin) {
    var cur = begin,
        go = true,
        c;
    if (TOTAL++ > MAX) {
      xtiger.cross.log('error', 'reached iteration limit (' + MAX + ')');
      return;
    }
    while (cur && go) {
      // manage repeats
      if (cur.startRepeatedItem && !seethrough) {
        if (cur.startRepeatedItem.getSize() === 0) { // nothing to serialize in repeater (min=0)
          // jumps to end of the repeater
          cur = cur.startRepeatedItem.getLastNodeForSlice(0);
          // in case cur has children, no need to serialize them as the slice is unselected (found on IE8)
          cur = cur.nextSibling;
          continue;
        }
      }
      if (cur.beginChoiceItem && (cur.beginChoiceItem != origin)) {
        c = cur.beginChoiceItem;
        if (c.items[c.curItem][0] !== c.items[c.curItem][1]) {
          _sliceIter(c.items[c.curItem][0], c.items[c.curItem][1], accu, seethrough, c);
        } else {
          // a choice slice starts and end on the same node
          _nodeIter(c.items[c.curItem][0], accu, seethrough);
        }
        cur = c.items[c.items.length - 1][1]; // sets cur to the last choice
        // xtiger.cross.log('debug', 'jump to end of last slice ' + cur.tagName ? cur.tagName : '#t');
      } else {
        // FIXME: we have an ambiguity <xt:use types="a b"><xt:use label="within_a"...
        // and <xt:use label="within_a"><xt:use types ="a b"....
        /// The current implementation will privilege First interpretation
        _nodeIter(cur, accu, seethrough); // FIXME:  first interpretation
      }
      if (cur === end) {
        go = false;
      }
      cur = cur.nextSibling;
    }
  }

  // Fake DOMLogger used to collect text content only (PCData)
  function _Logger () {
    this.stack = [];
  }

  _Logger.prototype = {

    discardNodeIfEmpty : function () {
    },

    write : function (text) {
      this.stack.push(text);
    },

    dump : function () {
      return this.stack.join(' ');
    },
    
    openTag : function (name) {
    },

    closeTag : function (name) {
    },

    reset : function () {
      this.stack = []
    }
  };

  function _WrappedSet (targets, seethrough) {
    this.seethrough = seethrough; // to show optional repetitions content
    this.targets = targets; // FIXME: should we make a copy ?
    this.first = targets[0];
  }

  _WrappedSet.prototype = {

    // lazy evaluation for wrapped set node list
    _list : function () {
      var i;
      // xtiger.cross.log('debug', 'reset wrapped set iteration counter (' + TOTAL + ')');
      TOTAL = 0;
      if (this.targets) {
        this.list = [];
        for (i = 0; i < this.targets.length; i++) {
          _nodeIter(this.targets[i], this.list, this.seethrough);
        }
        delete this.targets;
      }
      return this.list;
    },
    
    // FIXME: directly accept an XML document template as source input (cf. load)
    transform : function ( optTemplateUrl ) {
      if (settings.bundlesPath) {
        if (this.first) {
          var status = new xtiger.util.Logger(), editor;
          try { // load and transform template
            editor = optTemplateUrl ? new xtiger.cross.loadDocument(optTemplateUrl, status) : document;
            if (editor) {
              form = new xtiger.util.Form(settings.bundlesPath);
              if (editor !== document) {
                form.setTemplateSource(editor);
                form.setTarget(this.first, true);
              } else {
                form.srcDoc = document;
                form.curDoc = document;
                form.srcForm = this.first;
              } 
              if (settings.enableTabGroupNavigation) {
                form.enableTabGroupNavigation();
              }
              form.transform(status);
            }
            if (status.inError()) {
              _raiseError(status.printErrors());
            } else {
              this.first.xttHeadLabel = form.getEditor().headLabel;
            }
          } catch (e) {
            _raiseError('exception ' + e.name + ' ' + e.message);
          }
        } else {
          _raiseError('cannot load template into empty wrapped set');
        }
      } else {
        _raiseError('missing "bundlesPath" to transform template');
      }
      return this;
    },
    
    xml : function () {
      var algo, accu, res = '';
      if (this.first) {
        accu = new xtiger.util.DOMLogger();
        algo = settings.serializer || xtiger.editor.Generator.prototype.defaultSerializer;
        if (algo) {
          algo.serializeData(this.first, accu, this.first.xttHeadLabel);
          res = accu.dump();
        } else {
          _raiseError('missing XML serializer algorithm');
        }
      }
      return res;
    },
    
    // Load XML data into the 1st node of the wrapped set
    // The source may be an XML string, a URL string, or an XML document object
    load : function ( source ) {
      var algo, dataSrc, status, input = source;
      if (this.first) {
        algo = settings.loader || xtiger.editor.Generator.prototype.defaultLoader;
        status = new xtiger.util.Logger();
        if (algo) {
          if (typeof source === "string") {
            if (source.replace(/^\s*/,'').charAt(0) === '<') { // assumes XML string
              input = source;
            } else { // assumes URL 
              input = xtiger.cross.loadDocument(source, status);
            }
          } else if (! source) {
            status.logError('undefined or missing XML data source')
          }
          if (input && !status.inError()) {
            dataSrc = new xtiger.util.DOMDataSource(input);
            algo.loadData(this.first, dataSrc);
          } else {
            _raiseError(status.printErrors());
          }
        } else {
          _raiseError('missing XML serializer algorithm');
        }
      } else {
        _raiseError('cannot load XML data source into empty wrapped set');
      }
      return this;
    },

    length : function () {
      return this._list().length;
    },

    get : function (rank) {
      return this._list()[rank];
    },

    clear : function (propagate) {
      var i, list = this._list();
      for (i = 0; i < list.length; i++) {
        list[i].clear(propagate);
      }
      return this;
    },

    update : function (data) {
      var i, list = this._list();
      for (i = 0; i < list.length; i++) {
        list[i].update(data);
      }
      return this;
    },

    text : function () {
      var i, list = this._list(), logger = new _Logger();
      for (i = 0; i < list.length; i++) {
        list[i].save(logger);
      }
      return logger.dump();
    },

    values : function () {
      var i, list = this._list(), logger = new _Logger(), res = [];
      for (i = 0; i < list.length; i++) {
        list[i].save(logger);
        res.push(logger.dump());
        logger.reset();
      }
      return res;
    },

    configure : function (option, value) {
      var i, list = this._list();
      for (i = 0; i < list.length; i++) {
        list[i].configure(option, value);
      }
      return this;
    },

    apply : function (func, toHandle) {
      var i, list = this._list();
      for (i = 0; i < list.length; i++) {
        func(toHandle ? list[i].getHandle() : list[i]);
      }
      return this;
    }
  };

  // Creates AXEL wrapped set function and global object
  var _axel = function axel_ws (nodes, seethrough, doc) {
    var target;
    if (typeof nodes === 'string') { // jQuery selector
      if (GLOBAL.jQuery) {
        target = $(nodes, doc || document).get();
      } else {
        xtiger.cross.log('warning', 'jQuery missing to interpet wrapped set selector "' + nodes  + '"');
        target = [];
      }
    } else if (Object.prototype.toString.call(nodes) === "[object Array]") { // array of DOM nodes
      target = nodes;
    } else if (nodes instanceof GLOBAL.jQuery) { // wrapped set
      target = nodes.get();
    } else if (nodes) {
      target = [ nodes ];
    } else {
      xtiger.cross.log('warning', 'empty wrapped set selector');
      target = [];
    }
    return new _WrappedSet(target, seethrough);
  };

  // Extends a target object's with the own properties and methods
  // of a source object whenever they are not already defined
  // if proto is true extends the target's prototype
  // if force is true extends even if already defined
  _axel.extend = function extend (target, source, proto, force) {
    if (proto) {
      for (var x in source){
        if (source.hasOwnProperty(x)) {
          if (force || (typeof target.prototype[x] === "undefined")) {
            target.prototype[x] = source[x];
          }
        }
      }
    } else {
      for (var x in source){
        if (source.hasOwnProperty(x)) {
          if (force || (typeof target[x] === "undefined")) {
            target[x] = source[x];
          }
        }
      }
    }
  };
  
  _axel.setup = function setup ( hash ) {
    _axel.extend(settings, hash);
  };
  
  // Limits max iteration counter
  _axel.setIterationLimit = function (nb) { MAX = nb; };

  GLOBAL.$axel = _axel;
}(window));

// file: axel/src/core/plugin.js
/* ***** BEGIN LICENSE BLOCK *****
 *
 * @COPYRIGHT@
 *
 * This file is part of the Adaptable XML Editing Library (AXEL), version @VERSION@
 *
 * @LICENSE@
 *
 * Web site : http://media.epfl.ch/Templates/
 *
 * Author(s) : Stephane Sire
 *
 * ***** END LICENSE BLOCK ***** */

/*****************************************************************************\
|                                                                             |
|  AXEL Plugin                                                                |
|                                                                             |
|  manages plugins life cycle (registration)                                  |
|  exposed as $axel.plugin                                                    |
|                                                                             |
|*****************************************************************************|
|                                                                             |
|  Global functions:                                                          |
|    $axel.plugin.register                                                    |
|        registers a plugin object                                            |
|                                                                             |
\*****************************************************************************/
xtiger.editor.Plugin = function () {
}

xtiger.editor.Plugin.prototype = {
 pluginEditors : {},

 // Returns a factory for the xtigerSrcNode if it corresponds to a primitive editor
 // typesArray is an Array containing the list of types for the node
 getEditorFor : function (xtigerSrcNode, typesArray){
   var factory, editor;
   if (typesArray.length === 1) { // currently only 'singleton' use/bag may be primitive editors...
     editor = typesArray[0];
     factory = this.pluginEditors[editor];
   }
   return factory;
 },

 // Returns true if the xtigerSrcNode corresponds to a primitive editor
 // typesStr is a String representing the list of types for the node
 hasEditorFor : function (xtigerSrcNode, typesStr) {
   var res, editor;
   if (this.pluginEditors[typesStr]) {
     res = true;
   } else {
     var editor = typesStr;
     res = (this.pluginEditors[editor] !== undefined);
   }
   return res;
 }
};

(function ($axel) {

  var _keyCounter = 0; // counter for key generation

  function createUniqueKey ( type ) {
   return type + (_keyCounter++);
  }

  ////////////////////////////////
  // Basic Plugin methods       //
  ////////////////////////////////

  // NOTE: these methods are imported to the plugin K using a mixin approach
  //       maybe they could be inherited from a base plugin K instead ?
  var _pluginK = {

   // FIXME: transitional while adopting new API
   load : function (aPoint, aDataSrc) {
     this.onLoad(aPoint, aDataSrc);
   },

   // FIXME: transitional while adopting new API
   save : function (aLogger) {
     this.onSave(aLogger);
   },

   _init : function ( aHandle, aDocument, aKey ) {
     this._document = aDocument;
     this._key = aKey;
     this._handle = aHandle;
     this._isModified = false;
   },

   // Initializes _param, _option, _content from the template DOM node
   // <xt:use _param="..." _option="...">_content</xt:use>
   // <xt:attribute _param="..." _option="..." default="_content"/>
   _parseFromTemplate : function (aXTNode) {
     var tmp;
     this._param = {};
     xtiger.util.decodeParameters(aXTNode.getAttribute('param'), this._param);
     this._content = xtdom.extractDefaultContentXT(aXTNode);
     tmp = aXTNode.getAttribute('option');
     this._option = tmp ? tmp.toLowerCase() : null;
   },

   // Initializes _param, _option, _content from the seed
   _parseFromSeed : function (aSeed) {
     this._param = {};
     $axel.extend(this._param, aSeed[1], false, true); // takes a snapshot
     this._content = aSeed[2];
     this._option = aSeed[3];
   },

   makeSeed : function () {
     if (! this._seed) { // lazy creation
       this._seed = [this._getKFactory(), this._param, this._content, this._option];
     }
     return this._seed;
   },

   getParam : function (name) {
     return this._param[name] || this._getKParam(name);
   },

   getDefaultData : function () {
     return this._content;
   },

   // FIXME: maybe we should memorize all the attributes from the XTiger xt:use
   // or xt:attribute source node and use a generic getAttribute method instead ?
   // Alternatively we could also merge these attributes with the param hash ?
   getOption : function () {
     return this._option;
   },

   configure : function () {
     // TBD
   },

   getUniqueKey : function () {
     return this._key;
   },

   getDocument : function () {
     return this._document;
   },

   getHandle : function () {
     return this._handle;
   },

   setModified : function (isModified) {
     this._isModified = isModified;
   },

   isModified : function () {
     return this._isModified;
   },

   // DEPRECATED
   can : function (aFunction) {
     return typeof this[aFunction] === 'function';
   },

   // DEPRECATED
   execute : function (aFunction, aParam) {
     return this[aFunction](aParam);
   },

   isOptional : function () {
     return false;
   },

   isFocusable : function () {
     return false;
   },

   focus : function () {
   },

   unfocus : function () {
   }
  };

  ////////////////////////////
  // Optional plugin Mixin  //
  ////////////////////////////
  var _pluginOptionK = {

   // extends instance with properties : _isOptional, _isOptionSet, _optCheckBox
   _onInitOption : function () {
     var option = this.getOption();
     if (option) { // option attribute was declared on XTiger node
       this._isOptional = true;
       this._optCheckBox = this._handle.previousSibling; // see PluginFactory.createModel
       if (option === 'unset') {
         // Quirk to prevent unset to return immediately before calling set / unset
         this._isOptionSet = true;
      }
      (option === 'set') ? this.set(false) : this.unset(false);
     } else {
       // do as if not optional (FIXME: print a warning "missing option attribute in template" ?)
       this._isOptional = false;
     }
   },

   _onAwakeOption : function () {
     var _this = this;
     if (this.isOptional()) {
       xtdom.addEventListener(this._optCheckBox, 'click', function(ev) {
         _this.onToggleOpt(ev);
       }, true);
     }
   },

   // Overwrites original plugin method
   isOptional : function () {
     return this._isOptional;
   },

   isSet : function () {
     return this._isOptional && this._isOptionSet;
   },

   set : function(doPropagate) {
     // propagates state change in case some repeat ancestors are unset
     // at that moment
     if (doPropagate) {
       if (!this.getParam('noedit')) {
         xtiger.editor.Repeat.autoSelectRepeatIter(this.getHandle(true));
       }
       xtdom.removeClassName(this.getHandle(), 'axel-repeat-unset');
     }
     if (! this._isOptionSet) { // Safety guard (defensive)
       this._isOptionSet = true;
       if (this._isOptional) {
         xtdom.removeClassName(this.getHandle(), 'axel-option-unset');
         xtdom.addClassName(this.getHandle(), 'axel-option-set');
         this._optCheckBox.checked = true;
       }
     }
   },

   unset : function (doPropagate) {
     if (this._isOptionSet) { // Safety guard (defensive)
       this._isOptionSet = false;
       if (this._isOptional) {
         xtdom.removeClassName(this._handle, 'axel-option-set');
         xtdom.addClassName(this._handle, 'axel-option-unset');
         this._optCheckBox.checked = false;
       }
     }
   },

   onToggleOpt : function (ev) {
     this._isOptionSet ? this.unset(true) : this.set(true);
   }
  };

  ///////////////////////////////////////////////////////
  // Plugin Factory                                    //
  // ---                                               //
  // There will be one instance per registered plugin  //
  ///////////////////////////////////////////////////////
  function PluginFactory ( name, spec, defaults, genfunction, klassdefs ) {
  this.type = name;
  this.spec = spec;
  this.defaults = defaults;
  this.generator = genfunction; // invariant to filters
  this.klassdefs = klassdefs;
  this.klass = null; // lazy creation for unfiltered klass
  this.fklass = {}; // lazy creation for filtered klass
  }

  PluginFactory.prototype = {

   filterRe : /filter=\s*([\w\s]*);?/,

   // plugin DOM view generation
   createModel : function createModel (aContainer, aXTUse, aDocument) {
     var h = this.generator(aContainer, aXTUse, aDocument); // invoke klass markup generator
     // optional "optionality" feature (option="set|unset")
     if (this.spec.optional) {
       var option = aXTUse.getAttribute('option');
       if (option) {
         var check = xtdom.createElement(aDocument, 'input');
         xtdom.setAttribute(check, 'type', 'checkbox');
         xtdom.addClassName(check, 'axel-option-checkbox');
         aContainer.insertBefore(check, h);
       }
     }
     return h;
   },

   createEditorFromTree : function createEditorFromTree (aHandleNode, aXTUse, aDocument) {
     var f, inst, fsign, m, klass, param = aXTUse.getAttribute('param');
     if (this.spec.filterable && param) {
       m = this.filterRe.exec(param); // FIXME: trim tail whitespace
       if (m) {
         fsign = m[1];
       }
     }
     klass = this.getKlass(fsign);
     inst = new klass();
     inst._init(aHandleNode, aDocument, createUniqueKey(this.type));
     inst._parseFromTemplate(aXTUse);
     inst.onInit(inst.getDefaultData(), inst.getOption()); // life cycle routine
     inst.onAwake(); // FIXME: separate event registration (for filters)
     if (this.spec.optional) { // optional "optionality" mixin
       inst._onInitOption();
       inst._onAwakeOption();
     }
     return inst;
   },

   createEditorFromSeed : function createEditorFromSeed (aSeed, aClone, aDocument, aRepeater) {
     var fsign, inst, klass;
     fsign = this.spec.filterable ? aSeed[1]['filter'] : undefined; // FIXME: how to enforce that convention ?
     klass = this.getKlass(fsign);
     inst = new klass();
     inst._init(aClone, aDocument, createUniqueKey(this.type));
     inst._parseFromSeed(aSeed);
     inst.onInit(inst.getDefaultData(), inst.getOption(), aRepeater); // life cycle routine
     inst.onAwake(); // FIXME: separate event registration (for filters)
     if (this.spec.optional) {
       inst._onInitOption();
       inst._onAwakeOption();
     }
     return inst;
   },

   // Returns the klass constructor for fsign plugin if it exists,
   // creates it and returns it otherwise
   getKlass : function (fsign) {
     //xtiger.cross.log('debug', 'looking for klass ' + this.type + (fsign ? '-[' + fsign + ']' : ''));
     if (fsign) {
       if (! this.fklass[fsign]) {
         this.createPluginKlass(fsign);
       }
       return this.fklass[fsign];
     } else {
       if (! this.klass) {
         this.createPluginKlass(fsign);
       }
       return this.klass;
     }
   },

    createPluginKlass : function (fsign) {
      // dynamically create plugin class
      var kDefaults, klass = new Function();

      // computes static klass-level default parameters
      if (this.spec.filterable && fsign) {
        kDefaults = {};
        $axel.extend(kDefaults, this.defaults);
        this.applyFiltersDefaults(kDefaults, fsign);
      } else {
        kDefaults = this.defaults;
      }

      // dynamically populate plugin class prototype
      // using a closure to remember shared klass level parameters
      klass.prototype = (function (defaults, factory) {
        var _FACTORY = factory, // static klass factory
            _DEFAULTS = defaults; // static klass level default params
        return {
         _getKFactory : function () { return _FACTORY; },
         _getKParam : function (name) { return _DEFAULTS[name]; }
        };
      }(kDefaults, this));

      $axel.extend(klass.prototype, _pluginK);
      if (this.spec.optional) {
        $axel.extend(klass.prototype, _pluginOptionK, false, true);
      }

      // copy life cycle methods
      klass.prototype.onInit = this.klassdefs.onInit;
      klass.prototype.onAwake = this.klassdefs.onAwake;
      klass.prototype.onLoad = this.klassdefs.onLoad;
      klass.prototype.onSave = this.klassdefs.onSave;

      // overwrite basic plugin methods
      // FIXME: check method exists before overwriting to print warnings
      $axel.extend(klass.prototype, this.klassdefs.api, false, true);

      // add specific methods
      // FIXME: check method does not exist to print warnings
      $axel.extend(klass.prototype, this.klassdefs.methods);

      // add filter methods
      if (this.spec.filterable && fsign) {
        this.applyFilters(klass.prototype, fsign);
      }

      // stores klass
      if (fsign) {
        this.fklass[fsign] = klass;
      } else {
        this.klass = klass;
      }
      // xtiger.cross.log('debug', 'lazy creation for klass ' + this.type + (fsign ? '-[' + fsign + ']' : ''));
    }
  };

  $axel.plugin = $axel.plugin || {};

  /////////////////////////////
  // Public module functions //
  /////////////////////////////

  $axel.plugin.register = function ( name, spec, defaults, genfunction, klassdefs ) {
   var pluginK;
   if (xtiger.editor.Plugin.prototype.pluginEditors[name]) {
     xtiger.cross.log('error', 'plugin "' + name + '" has already been registered, registration aborted');
   } else {
     xtiger.cross.log('info', 'registering plugin "' + name + '"');
     // dynamically create plugin factory class
     // factoklass will create the plugin classes on the fly
     factoklass = new PluginFactory(name, spec, defaults, genfunction, klassdefs);
     // registers plugin class and specification
     if (spec.filterable) {
       xtiger.editor.Plugin.prototype.pluginEditors[name] = xtiger.util.filterable(name, factoklass);
     } else {
       xtiger.editor.Plugin.prototype.pluginEditors[name] = factoklass;
     }
   }
  };

  $axel.plugin.list = function () {
    var key, accu = [];
    for (key in xtiger.editor.Plugin.prototype.pluginEditors) { accu.push(key); }
    return accu;
  };
}($axel));



// file: axel/src/core/filter.js
/* ***** BEGIN LICENSE BLOCK *****
 *
 * @COPYRIGHT@
 *
 * This file is part of the Adaptable XML Editing Library (AXEL), version @VERSION@ 
 *
 * @LICENSE@
 *
 * Web site : http://media.epfl.ch/Templates/
 * 
 * Author(s) : Stephane Sire, Antoine Yersin
 * 
 * ***** END LICENSE BLOCK ***** */ 

(function ($axel) {
  
  var registry = {}; // remember filter mixins to apply them to plugin factory klasses later
  
  // Extends a plugin factory klass "that" called "name" to make the plugin accepts filters
  function makePluginFilterable ( name, that ) {

    if (! that) { // safe guard
      xtiger.cross.log('error', 'filter "' + name + '" is undefined');
      return that;
    }

    var _filtersRegistry = {}, // registry to store filters for "that" plugin
        _pluginName = name; // plugin name for log messages

    // Registers a filter under the given key
    that.registerFilter = function registerFilter (aKey, aFilter) {
      if (typeof(aFilter) === "object") { // NOTE: may test harder?
        if (_filtersRegistry[aKey]) {
          xtiger.cross.log('warning', '"' + _pluginName + '" plugin: filter "' + aKey + '" is already registred. Overwriting it.');
        }
        _filtersRegistry[aKey] = aFilter;
      }
    };

    // Extends static klass defaults parameters with static filter defaults ones
    that.applyFiltersDefaults = function applyFilters (aDefaults, aFiltersParam) {
      var _filtersnames = aFiltersParam.split(' '); // filters are given as a space-separated name list
      for (_i = 0; _i < _filtersnames.length; _i++) {
        var _filter = _filtersRegistry[_filtersnames[_i]]; // fetch the filter
        if (!_filter) {
          xtiger.cross.log('warning', '"' + _pluginName + '" plugin: missing filter "' + _filtersnames[_i] + '"');
          continue;
        }
        $axel.extend(aDefaults, _filter.defaults, false, true);
      }
    };

    // Apply all filters to a prototype object
    // FIXME: 
    // - apply to bultin methods
    // - apply to api method
    that.applyFilters = function applyFilters (aPrototype, aFiltersParam) {

      var _filtersnames = aFiltersParam.split(' '), // filters are given as a space-separated name list
          _remaps, _i, _p, token;

      // Apply filters
      // Chain methods by creating intermediate methods with different names
      for (_i = 0; _i < _filtersnames.length; _i++) {
        var _filter = _filtersRegistry[_filtersnames[_i]]; // fetch the filter
        if (!_filter) {
          xtiger.cross.log('warning', '"' + _pluginName + '" plugin: missing filter "' + _filtersnames[_i] + '"');
          continue;    
        }
        if (_filter) {
             // remaps chained methods
             _remaps = _filter.spec.chain;
             if (_remaps) {
                 if (typeof _remaps === "string") {
                   _remaps = [ _remaps ];
                 }
                 for (_p = 0; _p < _remaps.length; _p++) {
                   // alias the current version away 
                   // alias to no-op function if it doesn't exist
                   token = '__' + _filtersnames[_i] + '__' + _remaps[_p];
                   aPrototype[token] = aPrototype[_remaps[_p]] || function () { };
                 }
             }

             // copy life cycle methods
             if (_filter.mixin.onInit) {
               aPrototype.onInit = _filter.mixin.onInit;
             }
             if (_filter.mixin.onAwake) {
               aPrototype.onAwake = _filter.mixin.onAwake;
             }
             if (_filter.mixin.onLoad) {
               aPrototype.onLoad = _filter.mixin.onLoad;
             }
             if (_filter.mixin.onSave) {
               aPrototype.onSave = _filter.mixin.onSave;
             }

             // overwrite basic plugin methods
             // FIXME: check method exists before overwriting to print warnings
             $axel.extend(aPrototype, _filter.mixin.api, false, true);
             
             // add specific methods
             // FIXME: check method does not exist to print warnings
             $axel.extend(aPrototype, _filter.mixin.methods, false, true);
         }
      }
    };

    return that;
  }

  // Registers a filter mixin so that it can be applied later on to a plugin klass
  function registerFilter ( name, spec, defaults, mixin ) {
    if (registry[name]) {
      xtiger.cross.log('error', 'attempt to register filter "' + name + '" more than once');
    } else {
      registry[name] = {
        spec : spec,
        defaults : defaults,
        mixin : mixin
      }
    }
  }
  
  // Introspection function (for debug) 
  // FIXME: find a way to list which filters have been applied to which plugins
  function listFilters () {
    var key, accu = [];
    for (key in registry) { accu.push(key); }
    return accu;
  }
  
  // Applies one or more registered filter(s) to one or more plugin klass(es)
  // FIXME: make this asynchronous to break dependency between plugin / filter declaration order ?
  function applyFilterToPlugin ( spec ) {
    var key, filterMixin, plugins, target;
    for (key in spec) { 
      filterMixin = registry[key];
      plugins = spec[key];
      plugins = (typeof plugins === 'string') ? [ plugins ] : plugins;
      if (filterMixin) {
        while (plugins.length > 0) {
          target = plugins.shift();
          if (xtiger.editor.Plugin.prototype.pluginEditors[target]) { // FIXME: $axel.plugin.get(target)
            xtiger.editor.Plugin.prototype.pluginEditors[target].registerFilter(key, filterMixin);
          } else {
            xtiger.cross.log('error', 'attempt to register filter "' + key + '" on unkown plugin "' + target + '"' );
          }
        }
      } else {
        xtiger.cross.log('error', 'attempt to register unkown filter "' + key + '" on plugin(s) "' + plugins.join(',')  + '"' );
      }
    }
  }
  
  // Exportation 
  xtiger.util.filterable = makePluginFilterable;
  $axel.filter = $axel.filter || {};
  $axel.filter.register = registerFilter;
  $axel.filter.applyTo = applyFilterToPlugin;
  $axel.filter.list = listFilters;  
}($axel));

// file: axel/src/editor/classical/generator.js
/* ***** BEGIN LICENSE BLOCK *****
 *
 * @COPYRIGHT@
 *
 * This file is part of the Adaptable XML Editing Library (AXEL), version @VERSION@ 
 *
 * @LICENSE@
 *
 * Web site : http://media.epfl.ch/Templates/
 * 
 * Author(s) : Stephane Sire
 * 
 * ***** END LICENSE BLOCK ***** */

/**
 * Generates an editable XHTML tree while iterating with a xtiger.parser.Iterator on an XTiger XML template
 * FIXME: currently the template is fully developped into the DOM, future implementations should manage 
 * a cache for components, hence the Generator could become en Editor class that maintains the cache
 */
xtiger.editor.Generator = function (baseUrl) {
  if (baseUrl) {  xtiger.resources.setBase(baseUrl);  }
  this.plugins = new xtiger.editor.Plugin();
}

xtiger.editor.LABEL_MARK = 0; // unused (see verifyBoundary)
xtiger.editor.REPEAT_MARK = 1; 
xtiger.editor.CHOICE_MARK = 2;

xtiger.editor.Generator.prototype = {
  
  markerNames : ['xttOpenLabel', 'xttCloseLabel', 'startRepeatedItem', 'endRepeatedItem', 
    'beginChoiceItem', 'endChoiceItem'], // 'xttStringEditor'
    
  // Returns true if we can safely add a marker on the node given as parameter
  // Returns false if the node cannot hold markers or if it has already been marked
  isBoundarySafe : function (node) {
    if (! node) { // sanity check (this happens in IE if <repeat> instead of <xt:repeat> and template in iframe, or if <span/>)
      alert('Empty node in transformation, the template may contain XHTML errors, please correct it !');
      return false;
    }
        
    // special treatment for IE as TEXT nodes do not support custom attributes
    if (xtiger.cross.UA.IE && (node.nodeType != xtdom.ELEMENT_NODE)) {
      return false;
    }
    // checks if node has already been marked for a given category
    for (var i =0; i < this.markerNames.length; i++) {
      if ( node[ this.markerNames[i] ] ) {
        // xtiger.cross.log("debug", "plants bounds for node "+node.nodeName+" because "+this.markerNames[i]);
        return false;
      }
    }
    if ((node.nodeType == xtdom.ELEMENT_NODE) && (node.nodeName.search('menu-marker') != -1)) {
      return false; // FIXME: maybe we can optimize the second test (is search costly ?)
    }
    return true;
  },
  
  // category is currently not used (because for serialization we cannot share marks on nodes)
  verifyBoundaries : function (container, category) {
    var begin;
    if (! this.isBoundarySafe(container.firstChild)) {
      begin = xtdom.createElement(this.curDoc, 'span');
      xtdom.addClassName(begin, 'axel-core-boundary');
    }
    if (! this.isBoundarySafe(container.lastChild)) {
      var end = xtdom.createElement(this.curDoc, 'span');
      xtdom.addClassName(end, 'axel-core-boundary');
      container.appendChild (end);        
    }
    if (begin) { // inserted after end in case there is only one child
      container.insertBefore(begin, container.firstChild);
    }   
  },      
               
  // Returns the DOM node that need to be managed which is saved in the 'item' element
  // SHOULD not be called with the current algorithm
  getNodeFromOpaqueContext : function (item) {
      xtiger.cross.log('warning', 'unexpected call to "getNodeFromOpaqueContext" in "generator.js"');
      return item;
  },
    
  // Saves a reference to the XTiger source node into the context when a xt:use or xt:bag node is traversed. 
  // Currently the refNode content is only used by primitive editors (such as String) to create their initial state
  // The context on the top may be modified to instantiate special purpose editors (such as a Choice editor), 
  // in that case it is transformed from refNode to [refNode, editor]
  saveContext : function (xtSrcNode, isOpaque) {
    if (xtdom.isUseXT(xtSrcNode) || xtdom.isBagXT(xtSrcNode)) {
      this.context.push(xtSrcNode);
    }
  },

  restoreContext : function (xtSrcNode) {
    if (xtdom.isUseXT(xtSrcNode) || xtdom.isBagXT(xtSrcNode)) {         
      this.context.pop();     
    }
  },

  // Forces a context save of a given value
  pushContext : function (value) {
    this.context.push (value);
  },
  
  // Forces a context restoration
  popContext : function () {
    return this.context.pop ();
  },
    
  // Memorizes a pending editor in the current context
  // The editor may be reused before restoring the context
  savePendingEditor : function (ed, menu) {
    var top = this.popContext();
    this.pushContext ([top, [ed, menu]]); // replaces top of stack with an array
  },
  
  // Returns the pending editor that could have been added to the context
  // or false if there is none.
  getPendingEditor : function () {
    if (this.context.length > 0) {  // checks it has traversed at least a xt:use or xt:bag
      var top = this.context[this.context.length - 1];
      if (top instanceof Array) { // checks if the top of the context contains a pending editor
        return top[1];
      }
    }
    return false;
  },
  
  peekTopContext : function () {
    var top = this.context[this.context.length - 1];
    return (top instanceof Array ? top[0] : top);
  },
           
  coupleWithIterator : function (iterator) { 
    this.iterator = iterator;             
    // defines type anySimple for simple types 
    var anySimple = new Array("string", "number", "boolean");
    iterator.defineUnion("anySimple", anySimple);
  },
  
  // Prepares the generator to generate with a given iterator inside a given doc 
  // Label is the xt:head label attribute or undefined if it does not exist
  prepareForIteration : function (iterator, doc, label) { 
    this.context = []; // stack
    this.curDoc = doc;
    this.headLabel = label;
    if (! doc) { alert('You must specify a document to prepareForIteration !'); }
  },
    
  genComponentBody : function (componentNode, container) { },
   
  // Copies all the children of the component into the container 
  // Accumulates them in the accumulator to continue the transformation
  genComponentContent : function (componentNode, container, accu) {     
    xtdom.moveChildOfInto (componentNode, container, accu);
  },
  
  finishComponentGeneration : function (xtigerSrcNode, container) {     
    var context = this.getPendingEditor ();
    if (context) {
      var editor = context[0];
      // currently we have only Choice Editors as pending editors
      this.verifyBoundaries(container, xtiger.editor.CHOICE_MARK);
      var name = xtigerSrcNode.getAttribute('name'); // current type beeing expanded
      editor.addChoiceItem (name, container.firstChild, container.lastChild);     
      var i18n = xtigerSrcNode.getAttribute('i18n');
      if (i18n) {          
        var menu = context[1];
        // change the label of the <option> in the <select> menu created for the <xt:use>
        var options = menu.getElementsByTagName('option');
        for (var i = 0; i < options.length; i++) {
          var text = options.item(i).firstChild;
          if (text.data == name) {
            text.data = i18n;
            break;
          }
        }
      }         
    }
    // begin experimental menu-marker feature
    if (container.querySelector) {
      var select = container.querySelector('select[class]');
      if (select) {                                               
        var cname = select.getAttribute('class');
        menuMarker = xtdom.getMenuMarkerXT(container, cname);
        if (menuMarker) {                                    
          // replaces menuMarker with select                 
          menuMarker.parentNode.replaceChild(select, menuMarker);  
        }
      }
    }
    // end experimental menu-marker feature   
    //FIXME: we could handle a xttOpenLabel and xttCloseLabel here too for inline components
  },
  
  genRepeatBody : function (repeatNode, container) { },
  
  genRepeatContent  : function (repeatNode, container, accu) { 
    xtdom.moveChildOfInto (repeatNode, container, accu);  
  },
  
  finishRepeatGeneration : function (repeatNode, container) { 
    this.verifyBoundaries(container, xtiger.editor.REPEAT_MARK);  
    var rc = new xtiger.editor.Repeat ();
    rc.initFromTree (container, repeatNode, this.curDoc);   
  },
    
  genIteratedTypeBody : function (kind, xtigerSrcNode, container, types) { 
    var menu, key, value;
    // generates type menu
    if (types.length > 1) {
      var s = menu = xtdom.createElement(this.curDoc, 'select');      
      for (var i = 0; i < types.length; i++) {
        var o = xtdom.createElement(this.curDoc, 'option');
        var t = xtdom.createTextNode(this.curDoc, types[i]); // FIXME : use i18n here !!!! or fix it after generation
        o.appendChild(t);
        s.appendChild(o);
      }
      // Experimental feature : param="marker=value" | "name=value"
      var pstr = xtigerSrcNode.getAttribute('param');
      if (pstr) {
        var i = pstr.indexOf('=');
        if (i != -1) {
          key = pstr.substr(0, i);
          value = pstr.substr(i + 1);
        }
      }
      if ((key == 'name') && value) {
        xtdom.addClassName(menu, value);
      } else if ((key = 'marker') && value) { // generates a <span class="value"><xt:menu-marker/><br/><select>...</span> group
        var span = xtdom.createElement(this.curDoc, 'span');
        xtdom.addClassName(span, value);
        var mm = xtdom.createElementNS(this.curDoc, 'menu-marker', xtiger.parser.nsXTiger);
        span.appendChild(mm);
        var br = xtdom.createElement(this.curDoc, 'br');
        span.appendChild(br);
        span.appendChild(menu);
        menu = span;
      }             
      // End experimental feature     
      container.appendChild(menu);
      var c = new xtiger.editor.Choice ();  
      /// Begin PATCH 
      var label = xtdom.getTagNameXT(xtigerSrcNode);    
      if (label && (label.indexOf(' ') != -1)) {
        c.initFromTree(s, label.split(' '), this.curDoc);     
      } else {
        c.initFromTree(s, types, this.curDoc);      
      }
      /// End PATCH 
      // c.initFromTree(s, types, this.curDoc);
      this.savePendingEditor (c, s); // will be used in finishComponentGeneration
      c.awake(s);
      xtiger.cross.log('plant', 'Created a Choice editor for types ' + '/' + types + '/' );
    }
  },
    
  // Limitations: xt:option, xt:bag are treated as xt:use
  // any string type is converted to a XttStringEditor (even if it was part of a mixed content model) 
  //
  // FIXME: END OF RECURSION should also address the possible Choice editor under way to call addChoiceItem....
  genIteratedTypeContent  : function (kind, xtigerSrcNode, container, accu, types) { 
    var factory;
    if (factory = this.plugins.getEditorFor(xtigerSrcNode, types)) { 
        // END OF RECURSION for primitive editors and xt:attribute elements
        // assumes default content was pushed on the stack
        var editorHandle = factory.createModel (container, xtigerSrcNode, this.curDoc);
        var srcUseOrBag = ('attribute' === kind) ? xtigerSrcNode : this.peekTopContext (); // attribute node not saved onto the context
        // currently srcUseOrBag and xtigerSrcNode are the same because terminal editors can only be on single choice xt:use        
        editorHandle.xttPrimitiveEditor = factory.createEditorFromTree (editorHandle, srcUseOrBag, this.curDoc);        
    } else {
        for (var i = 0; i < types.length; i++) {
          var curComponentForType = this.iterator.getComponentForType(types[i]);
          if (curComponentForType) { // constructed type
            var generated = curComponentForType.getClone (this.curDoc);
            container.appendChild(generated);
            accu.push (generated); // follow up transformation
          } else {  // END OF RECURSION for non constructed types editors
            var span = xtdom.createElement(this.curDoc, 'span');
            xtdom.addClassName (span, 'axel-generator-error');            
            var txt = xtdom.createTextNode (this.curDoc, 'ERROR: "' + types[i] + '" is undeclared or is terminal and part of a choice');
            span.appendChild (txt);
            container.appendChild (span);
          }
        }
    }
  },

  // adds xttOpenLabel and xttCloseLabel on the container boundaries which may be ELEMENT_NODE or TEXT_NODE
  finishIteratedTypeGeneration : function (kind, xtigerSrcNode, container, types) {    
    var label = xtdom.getTagNameXT(xtigerSrcNode);    
    if (! label)  return;                             
    /// Begin PATCH
    if (label.indexOf(' ') != -1) return;   
    /// End PATCH   
    if ('attribute' === kind) {
      label = '@' + label; // code for a label for an attribute
    }
    if (! container.firstChild) { // sanity check
      xtiger.cross.log('warning', 'XTiger component (label="' + label + '") definition is empty');
      return;
    }
    this.verifyBoundaries(container, xtiger.editor.USE_MARK);     
    xtiger.cross.log('plant', 'Planting use Start & End labels for '  + label); 
    if (container.firstChild.xttOpenLabel) {
      xtiger.cross.log('warning', 'use "' + label + '" and use "' + container.firstChild.xttOpenLabel + '" with same START !' );
    }   
    container.firstChild.xttOpenLabel = label;    
    if (container.lastChild.xttCloseLabel) {
      xtiger.cross.log('warning', 'use "' + label + '" and use "' + container.lastChild.xttCloseLabel + '" with same END !' );
    } 
    container.lastChild.xttCloseLabel = label;
  },
  
  // last callback
  finishTransformation : function (n) {
    // now activate all the Choice editor (except the one duplicated as models inside repeat)
    var treeWalker = xtiger.cross.makeTreeWalker (n, xtdom.NodeFilter.SHOW_ELEMENT,
          function(node) { return (node.markChoiceEditor) ? xtdom.NodeFilter.FILTER_ACCEPT : xtdom.NodeFilter.FILTER_SKIP; });
    while(treeWalker.nextNode()) {
      if (treeWalker.currentNode.markChoiceEditor) {  // Test for Safari
        treeWalker.currentNode.markChoiceEditor.initializeSelectedItem (0);
      }
    }                            
  },
  
  // Loads data from a DOMDataSource into the generated editor starting at node root
  loadData: function (root, dataSrc, loader) {
    var l = loader || this.defaultLoader;
    if (l) { l.loadData(root, dataSrc) } else { alert("Default XML loader missing !" ) }
  },

  // Serializes data from the generated editor starting at node root into a logger
  serializeData: function (root, logger, serializer) {
    var s = serializer ? serializer : this.defaultSerializer;
    if (s) { 
      s.serializeData(root, logger, this.headLabel);
    } else { 
      alert("Default XML serializer missing !") 
    }
  }
}

// file: axel/src/editor/classical/repeat.js
/* ***** BEGIN LICENSE BLOCK *****
 *
 * @COPYRIGHT@
 *
 * This file is part of the Adaptable XML Editing Library (AXEL), version @VERSION@ 
 *
 * @LICENSE@
 *
 * Web site : http://media.epfl.ch/Templates/
 * 
 * Author(s) : Stephane Sire
 * 
 * ***** END LICENSE BLOCK ***** */

/**
 * @class Repeat
 * Manages an "atomic" repeater
 */
xtiger.editor.Repeat = function () {
  this.items = [];   
  this.curDoc = null; // will be in initFromTree or initFromSeed
  this.originPosition = -1; // FIXME: this is a leg from PIAAC to maintain tocs,should we keep it ? 
  this.tickCount = 0;
  // this.model will be set in one of the init functions
}         
                                                      
// Static class function
// Traverses all the englobing repeat editors of a given DOM node
// Sets them if they were optional (minOccurs = 0) and unset
xtiger.editor.Repeat.autoSelectRepeatIter = function (startFrom) {  
  var r;
  var cur = startFrom;
  var startCount = 0;
  var endCount = 0;
  while (cur) {   
    if (cur.startRepeatedItem) {  startCount++; }
    if ((cur != startFrom) && cur.endRepeatedItem) {
      endCount++;  // does not count if repeat starts and ends on the node it landed on
    }
    // FIXME: is there a case where startRepeatedItem and endRepeated item can be on the same node ?
    if (startCount > endCount) {  
      r = cur.startRepeatedItem;
      if ((0 == r.min) && (0 == r.total)) {  // was optional and unset
        r.unsetOption (); // sets it
      }     
     // jumps at the begining of this repeater
     cur = r.getFirstNodeForSlice(0);
     startCount = endCount = 0; // reset counting  
    } 
    cur = cur.previousSibling;
  }
  if (startFrom.parentNode) {         
    // FIXME: we could define a .xtt-template-root in the DOM since the template may not start at document root ?
    xtiger.editor.Repeat.autoSelectRepeatIter (startFrom.parentNode);
  }
}   

xtiger.editor.Repeat.prototype = {  
  
  // FIXME: make trash template dependant ?=> create a xtiger.Template ?  
  trash : [], // deleted slices stored as [repeater, [slice,*]]   
  
  hasLabel : function () {
    return (this.label != 'repeat');
  },                
  
  getRepeatableLabel : function () {
    return this.pseudoLabel;
  },
  
  dump : function () {
    return this.label;
  },
  
  getSize : function () {
    // return this.items.length;
    return this.total;
  },                       
    
  // Returns the last position after which an item was inserted or pasted after user action
  // Actually when the repeater is expanded as a consequence of loading XML data 
  // the concept of origin position is undefined and it returns -1
  getOriginPosition : function () {
    return this.originPosition;   
  },
  
  getClockCount : function () {
    return this.tickCount;
  },

  // Returns the last node for the slice at index
  getLastNodeForSlice : function (index) {
    var pos = (index < this.items.length) ? index : this.items.length - 1;
    return this.items[pos][1];
  },

  // Returns the first node for the slice at index 
  // FIXME: createIt is temporary (experiment with TOC)
  getFirstNodeForSlice : function (index, createIt) {
    var pos;
    if (index < this.items.length) {
      pos = index;
      } else {
      if (createIt && (index == this.items.length)) {
        this.appendSlice(); 
      }
        pos = this.items.length - 1;
    }
    return this.items[pos][0];
  },               
  
  getSliceIndexForStartMarker : function (node) {
    for (var i = 0; i < this.items.length; i++) {
      if (this.items[i][0] == node) {
        return i;
      }
    }   
    return -1;
  },  
  
  makeSeed : function (srcRepeater, dict) {
    if (this == srcRepeater) {
      xtiger.cross.log('clone-trace', '*repeater* do not replicate top/master repeater', this.seed[3]);
    } else {
      if (this.seed) {
        if (this.seed[0] == -2) { // -2 means it's a top/master repeater seed
          var m = dict[this.seed[3]]; // remaps it as a (-1) non top/master seed if not already done
          if (! m) {
            var id = xtdom.genId();
            xtiger.cross.log('clone-trace', '*repeater* remaps a non top/master repeater', id);
            m = [-1, this.seed[1], this.seed[2], id, this.min, this.max, this.pseudoLabel];
            dict[this.seed[3]] = m;           
          }
          return m;
        } else {
          xtiger.cross.log('debug', '*repeater* [should not happen] seed ' + this.seed[3] + ' already mapped as ' + this.seed[0]);
        }
      } else {
        var id = xtdom.genId();
        xtiger.cross.log('debug', '*repeater*  [should not happen] making a entirely repeater seed', id);
        this.seed = [-1, srcRepeater.label, srcRepeater.model, id, this.min, this.max, this.pseudoLabel]; // global model sharing
      }
    }
    return this.seed; // normally for the top/master repeater it has already been created by ShallowClone
  },  
  
  initFromSeed : function (repeaterSeed, doc) {                                             
    this.curDoc = doc;
    this.label = repeaterSeed[1];
    this.model = repeaterSeed[2];          
    this.min = repeaterSeed[4];          
    this.max = repeaterSeed[5];
    this.pseudoLabel = repeaterSeed[6];
    this.total = (this.min > 0) ? 1 : 0; // FIXME: generate entries if this.min > 1 !   
    this.items = [[null, null, null, null]]; // will be set through setStartItem, setEndItem and setMarkItem    
  },
  
  setStartItem : function (node) {
    this.items[0][0] = node;
  },

  setEndItem : function (node) {
    this.items[0][1] = node;
  },

  // this method supposes the callee Repeater has not yet been repeated becauses it always initializes 
  // the first repeated slice (this.items[0])
  setMarkItem : function (node) {
    if (this.items[0][2]) { // sets mark1 (left menu)
      this.items[0][3] = node;  
    } else { // sets mark2 (right menu)
      this.items[0][2] = node;
    }
    var _this = this; // closure
    xtdom.addEventListener (node, 'click', function (ev) { _this.handleRepeat(ev)}, true);
    xtiger.cross.log('iter-trace', 'setMarkItem for repeater ' + this.dump() + ' on node ' + node.tagName);
  },       
                                         
  // Update menu depending on repeater state and min/max constraints
  configureMenuForSlice : function (index) {   
    // window.console.log('Configure menu min=%s max=%s total=%s index=%s length=%s', this.min, this.max, this.total, index, this.items.length);
    if (index >= this.items.length) {
      xtiger.cross.log('error', 'Wrong menu configuration in repeater ' + this.dump());
      return;
    }
    var leftImg = this.items[index][2];
    var rightImg = this.items[index][3];    
         
    // configures image for left menu
    var srcLeft = xtiger.bundles.repeat.checkedIconURL;
    if (0 == this.min) {
      if (0 == this.total) {
        srcLeft = xtiger.bundles.repeat.uncheckedIconURL; // no item loaded into the repeat
      } else if (1 == this.total) {
        srcLeft = xtiger.bundles.repeat.checkedIconURL; // just one item loaded into the repeat
      } else {                         
        srcLeft = xtiger.bundles.repeat.minusIconURL; // more than one item and they can be deleted 
      }
    } else if (this.total == this.min) {
      srcLeft = xtiger.bundles.repeat.plusIconURL; // only one item and min is not 0
    } else {
      srcLeft = xtiger.bundles.repeat.minusIconURL;
    }               
    // window.console.log('Set left ' + srcLeft);
    xtdom.setAttribute (leftImg, 'src', srcLeft);  
    
    // configures image for right menu
    xtdom.setAttribute (rightImg, 'src', xtiger.bundles.repeat.plusIconURL); // always +
    var rightVisible = false;
    if (0 == this.min) {
      if (((this.max > 1) || (-1 == this.max)) && (this.total > 0)) {
        rightVisible = true;
      }
    } else if ((this.total > 1) && ((this.max > 1) || (-1 == this.max))) {
      rightVisible = true;      
    }                          
    // window.console.log('Set right visibility ' + rightVisible);
    if (rightVisible) {
      xtdom.removeClassName (rightImg, 'axel-core-off');
    } else {
      xtdom.addClassName (rightImg, 'axel-core-off');
    }
  },
    
  initFromTree : function (container, repeatNode, doc)  {
    this.curDoc = doc;
    this.label = repeatNode.getAttribute('label') || 'repeat'; // FIXME: supposes 'repeat' is forbidden in XML tag names
    this.pseudoLabel = repeatNode.getAttribute('pseudoLabel') || 'repeat';
    var val = repeatNode.getAttribute('minOccurs') || 0;
    this.min = isNaN(val) ? 1 : parseInt(val); // defaults min to 1
    val = repeatNode.getAttribute('maxOccurs') || -1;
    this.max = isNaN(val) ? -1 : parseInt(val); // defaults max to -1 (unbounded)
    this.total = (this.min > 0) ? 1 : 0; // FIXME: generate entries if this.min > 1 !
    xtiger.cross.log('plant', 'Create Repeat Editor ' + this.min + '/' + this.max + '/' + this.label);    
        
    // prepares the Repeat menu (an <img>)
    var rightImg = xtdom.createElement(this.curDoc, 'img');
    var width = '16';
        
    // Insertion Point sniffing: the goal is to guess and to insert the repeater menu
    var insertPoint;
    if (insertPoint = xtdom.getMenuMarkerXT(container)) {   
      // 1st case: there is a <xt:menu-mark> remaining inside the container
      insertPoint.parentNode.replaceChild(rightImg, insertPoint);
      width = insertPoint.getAttribute('size') || width; // fixme: inherit class attribute instead
    } else {
      // 2nd case: inserts the menu at the end of the slice
      container.appendChild(rightImg);        
    } 
    
    // finishes menu configuration
    xtdom.setAttribute (rightImg, 'width', width);
    xtdom.addClassName (rightImg, 'axel-repeat-right');
    
    // inserts the second menu
    var leftImg = xtdom.createElement(this.curDoc, 'img');
    xtdom.setAttribute (leftImg, 'width', width);
    xtdom.addClassName (leftImg, 'axel-repeat-left');
    rightImg.parentNode.insertBefore (leftImg, rightImg, false);    
    
    // sets repeater boundaries to the whole slice    
    start = container.firstChild;
    end = container.lastChild;
    
    // saves special attributes         
    if (start.startRepeatedItem) {
      xtiger.cross.log('warning', 'Repeat "' + this.label + '" and repeat "' + start.startRepeatedItem.label + '" with same START boundaries !');
    }   
    start.startRepeatedItem = this; // NOTE marker here 
    // start.startRepeatLabel = 'startRepeat'; //DEBUG IE
    if (end.endRepeatedItem) {
      xtiger.cross.log('warning', 'Repeat "' + this.label + '" and repeat "' + end.endRepeatedItem.label + '" with same END boundaries !');
    }   
    end.endRepeatedItem = this; // NOTE MARKER HERE
    // end.endRepeatLabel = 'endRepeat'; //DEBUG IE     
    leftImg.markRepeatedEditor = this;  
    rightImg.markRepeatedEditor = this; 
    
    if (start.xttOpenLabel) {
      xtiger.cross.log('warning', 'Repeat "' + this.label + '" and use with same START boundaries !');
    }   
    if (end.xttCloseLabel) {
      xtiger.cross.log('warning', 'Repeat "' + this.label + '" and use with same END boundaries !');
    }   
    var _this = this; // closure
    xtdom.addEventListener (leftImg, 'click', function (ev) { _this.handleRepeat(ev)}, true);
    xtdom.addEventListener (rightImg, 'click', function (ev) { _this.handleRepeat(ev)}, true);
    // creates a clone of the repeated content (linked with its repeated editors)
    // it will resides outside of the tree
    // if (this.max > 1) {
      this.model = this.shallowClone (container); 
    // }
    this.items.push ( [start, end, leftImg, rightImg] ); // first slice  
    this.configureMenuForSlice (0);
    if (0 == this.min) {
      this.unactivateSliceAt (0);
    }
  },      
  
  // The shallow clone used as a model only contains seeds for reinstantiating the editors
  shallowFinishCloning : function (clone, node, dict) {
    // use labels seeds
    if (node.xttOpenLabel)  clone.xttOpenLabel = node.xttOpenLabel;   
    if (node.xttCloseLabel) clone.xttCloseLabel = node.xttCloseLabel;       
    // repeat editors seeds
    if (node.markRepeatedEditor)  clone.markRepeatedEditor = node.markRepeatedEditor.makeSeed(this, dict);
    if (node.startRepeatedItem) clone.startRepeatedItem = node.startRepeatedItem.makeSeed(this, dict);
    if (node.endRepeatedItem) clone.endRepeatedItem = node.endRepeatedItem.makeSeed(this, dict);
    // choice editors seeds
    if (node.markChoiceEditor)  clone.markChoiceEditor = node.markChoiceEditor.makeSeed();    
    if (node.beginChoiceItem) clone.beginChoiceItem = node.beginChoiceItem.makeSeed();        
    if (node.endChoiceItem) clone.endChoiceItem = node.endChoiceItem.makeSeed();    
    // primitive editor seeds
    if (node.xttPrimitiveEditor)  clone.xttPrimitiveEditor = node.xttPrimitiveEditor.makeSeed();
    // service seeds
    if (node.xttService)  clone.xttService = node.xttService.makeSeed();
  },
    
  // FIXME: there is a bug when there are n repeat inside a repeat (n > 1), all the repeaters are merged and the last one wins
  // when the main repeater is cloned....
  shallowClone : function (node) {
    var dict = {}; // used to remap seeds
    var clone = xtdom.cloneNode (this.curDoc, node, false);  // "canonical tree" with "virgin" repeaters (should be unrepeated)
    this.seed = [-2, this.label, clone, xtdom.genId(), this.min, this.max, this.pseudoLabel]; // -2 is a convention (must be != from -1)    
    this.shallowFinishCloning (clone, node, dict);
    for (var i = 0; i < node.childNodes.length; i++) {
      this.shallowCloneIter (clone, node.childNodes[i], dict);
    }                                             
    return clone; // the clone is not saved in a document (dangling)
  },
                              
  // Creates a clone of the container including cloning of special attributes
  // This is a shallow clone because all the models set for the repeaters remain shared
  // set by XTigerTrans editor transformation algorithm
  shallowCloneIter : function (parent, node, dict) {   
    var clone = xtdom.cloneNode (this.curDoc, node, false);
    this.shallowFinishCloning (clone, node, dict);    
    parent.appendChild(clone);
    for (var i = 0; i < node.childNodes.length; i++) {
      this.shallowCloneIter (clone, node.childNodes[i], dict);
    }
  },
  
  // Cloning of the XttChoiceEditor(s) from the model sub-tree
  getChoiceEditorClone : function (dict, editorSeed) {
    var m = dict[editorSeed];  // find it's duplicated version
    if (! m) {
      var m = new xtiger.editor.Choice ();
      m.initFromSeed (editorSeed, this.curDoc); // FIXME : use a better hash key than another object ?
      dict[editorSeed] = m;
    }                     
    return m;
  },

  // Cloning of the Repeat editor(s) from their seed
  // Dict key is taken from the unique Repeat editor id saved into the seed
  getRepeatEditorClone : function (dict, editorSeed) {
    var m = dict[editorSeed[3]];  // find it's duplicated version
    if (! m) {
      var m = new xtiger.editor.Repeat ();
      m.initFromSeed (editorSeed, this.curDoc);
      dict[editorSeed[3]] = m; // FIXME : use a better hash key than another object ?
      // xtiger.cross.log('stack-trace', 'cloning repeat editor', m.dump(), '(' + editorSeed[3] + ')');
    }                     
    return m;
  },  
  
  deepFinishCloning : function (clone, node, modelDict, masterRepeater, accu) {
    // xt:use labels cloning
    if (node.xttOpenLabel)  clone.xttOpenLabel = node.xttOpenLabel;   
    if (node.xttCloseLabel) clone.xttCloseLabel = node.xttCloseLabel;   
    
    // repeat editor cloning if it is linked to an editor different than the current master
    if (node.startRepeatedItem) {
      if (node.startRepeatedItem[0] == -1) {  // it's not the current repeater
        var m = this.getRepeatEditorClone(modelDict[0], node.startRepeatedItem);  // find it's duplicated version
        m.setStartItem (clone);
        clone.startRepeatedItem = m; 
      } else {
        clone.startRepeatedItem =  this; // it belongs to the repeater beeing clone
        accu[0] = clone;
      }
    }  
    if (node.endRepeatedItem) {
      if (node.endRepeatedItem[0] == -1) {  // it's not the current repeater
        var m = this.getRepeatEditorClone(modelDict[0], node.endRepeatedItem);  // find it's duplicated version
        m.setEndItem (clone);
        clone.endRepeatedItem = m; 
      } else {
        clone.endRepeatedItem =  this; // it belongs to the repeater beeing clone
        accu[1] = clone;
      }
    }
    if (node.markRepeatedEditor) {
      if (node.markRepeatedEditor[0] == -1) {  // it's not the current repeater
        var m = this.getRepeatEditorClone(modelDict[0], node.markRepeatedEditor);  // find it's duplicated version
        m.setMarkItem (clone); // must do the addEventListener stuff as below (!)
        clone.markRepeatedEditor = m; 
      } else {
        // the following is equivalent to this.setMarkItem(clone) but it does not alter the repeater items list
        // because the accumulated index will be appended to it at the end
        clone.markRepeatedEditor =  this; // it belongs to the repeater beeing clone
        var _this = this; // closure
        xtdom.addEventListener (clone, 'click', function (ev) { _this.handleRepeat(ev)}, true);
        if (accu[2]) { // mark1 was already set, sets mark2
          accu[3] = clone;
        } else {
          accu[2] = clone;
        }
      }
    }   
      
    // choice editor cloning            
    if (node.markChoiceEditor) {
      var m = this.getChoiceEditorClone (modelDict[1], node.markChoiceEditor);
      m.setChoiceMenu (clone);
      clone.markChoiceEditor = m;         
    }
    if (node.beginChoiceItem) {
      var m = this.getChoiceEditorClone (modelDict[1], node.beginChoiceItem);
      m.setBeginChoiceItem (clone);
      clone.beginChoiceItem = m;        
    }
    if (node.endChoiceItem) {
      var m = this.getChoiceEditorClone (modelDict[1], node.endChoiceItem);
      m.setEndChoiceItem (clone);
      clone.endChoiceItem = m;        
    }
    
    // primitive editor cloning
    if (node.xttPrimitiveEditor) {
      var seed = node.xttPrimitiveEditor;
      var factory = seed[0];      
      clone.xttPrimitiveEditor = factory.createEditorFromSeed (seed, clone, this.curDoc, this);
    }

    // service cloning - DEPRECATED
    // if (node.xttService) {
    //   var seed = node.xttService;
    //   var factory = seed[0];      
    //   clone.xttService = factory.createServiceFromSeed (seed, clone, this.curDoc, this);
    // }
  },
  
  // Creates a clone of the container including cloning of special attributes
  // This is a deep clone because all the models set for the repeaters are also cloned
  // Returns the clone which dangling
  deepClone : function (node, accu) {
    var clone = xtdom.cloneNode (this.curDoc, node, false);  
    var modelDict = [{}, {}]; // first hash for Repeat editor and second for Choice editor
    this.deepFinishCloning (clone, node, modelDict, this, accu); 
    for (var i = 0; i < node.childNodes.length; i++) {
      this.deepCloneIter (clone, node.childNodes[i], modelDict, this, accu);
    }    
    return clone;
  },
                      
  // modelDict contains translation table to duplicate nested Repeat editors
  // masterRepeater is the repeater which initiated the cloning          
  // accu stores the indexical elements (start, end, mark) for the masterRepeater
  deepCloneIter : function (parent, node, modelDict, masterRepeater, accu) {    
    if (node.xttPrimitiveEditor) { // FIXME: leaf cloning behavior (to be verified)
      var clone = xtdom.cloneNode (this.curDoc, node, true);    
      parent.appendChild (clone); // parent and clone MUST BE in the same document
      this.deepFinishCloning (clone, node, modelDict, masterRepeater, accu); 
      return;
    } 
    var clone = xtdom.cloneNode (this.curDoc, node, false);   
    parent.appendChild (clone); // parent and clone MUST BE in the same document
    this.deepFinishCloning (clone, node, modelDict, masterRepeater, accu); 
    for (var i = 0; i < node.childNodes.length; i++) {
      this.deepCloneIter (clone, node.childNodes[i], modelDict, masterRepeater, accu);
    }
  },
  
  // Returns a new slice copied from the repeater model
  getOneCopy : function (index, position) {
    this.tickCount++;
    return this.deepClone(this.model, index);
  },   
      
  // Keeps only one slice and updates this.total
  // TODO: clear all primitive editors in slice
  reset : function () {
    var i = this.total;
    while (i-- > 1) {
      this.removeItemAtIndex(this.total-1, false);
    }
    this.total = this.min;
    this.configureMenuForSlice(0);
    this.dispatchEvent(this.items[0], 'clear');
    this.unactivateSliceAt(0);
  },
  
  // Inserts a slice index into the list of slices of the repeater at a given position
  // to be called after the slice nodes have been inserted into the DOM
  plantSlice : function (index, position) {
    if (this.items.length == 1) { 
      // there was only one item, now there will be two so they both can be deleted
      xtdom.removeClassName(this.items[0][2], 'axel-core-off');
    }
    this.items.splice(position + 1, 0, index);      
  },     
    
  // Called by the generator each time a new slice has been loaded
  // Must be done explicitely (and not in appendSlice) because optional repeater (min=0)
  // have a state with 1 slice and 0 data
  sliceLoaded : function () {                
    this.total++;                                                 
    if ((0 == this.min ) && (1 == this.total)) { // transition from 0 to 1
      this.activateSliceAt (0);
    }     
    if (((0 == this.min ) && (2 == this.total)) 
        || ((this.min > 0) && (this.total == (this.min + 1))))
    {                                
      // special transition
      for (var i = 0; i <= this.min; i++) {
        this.configureMenuForSlice (i);
      }
    }
    // updates menu configuration for the 1st item, added item and last item        
    this.configureMenuForSlice (this.total-1); // configuration for last item     
  },
    
  // Adds a new Slice copied from the repeater model at the end of the slices
  // Returns the index of the new slice - Called when loading XML data
  appendSlice : function () {   
    var lastIndex = this.items.length - 1;
    var lastNode = this.getLastNodeForSlice(lastIndex);
    var index = [null, null, null, null];
    this.originPosition = -1; // lastIndex; because currently load follows document order
    var copy = this.getOneCopy (index); // clones the model and creates a new slice
    xtdom.moveChildrenOfAfter (copy, lastNode);
    this.plantSlice (index, lastIndex);       
    this.dispatchEvent(index, 'duplicate'); // DEPRECATED
    if ($axel.binding) {
      $axel.binding.install(this.curDoc, index[0], index[1]);
    }
    return lastIndex + 1;  
  },
  
  // Manages the "menu" of the Repeater (i.e. plus and minus buttons)
  handleRepeat : function (ev) {    
    var appended = false;
    var target = xtdom.getEventTarget(ev);
    for (var i = 0; i < this.items.length; i++) {
      if (this.items[i][2] == target) {
        if ((0 == this.min) && (0 == this.total)) {
          this.unsetOption (); // in that case + was on the left (i.e. unchecked option)
          appended = true;
        } else if ((this.min > 0) && (1 == this.total)) { // in that case + was on the left...
          this.addItem(target, i, ev.shiftKey);
          appended = true;          
        } else {      
          if ((0 == this.min) && (1 == this.total)) {
            this.setOption (); // not a real delete
          } else {
            this.deleteItem(target, i, ev.shiftKey);
          }
        }
        break;
      } else if (this.items[i][3] == target) {  
        this.addItem(target, i, ev.shiftKey);
        appended = true;        
        break; // avoid recursion !
      }
    }
    if (appended) { 
      xtiger.editor.Repeat.autoSelectRepeatIter (this.getFirstNodeForSlice(0)); // propagates it      
    }
  },     
    
  // Transition from 0 item to 1 item (was optional, becomes part of the document)   
  // Only for repeated elements with a min of 0  !
  unsetOption : function () {
    this.total++; 
    this.configureMenuForSlice (0);
    this.activateSliceAt(0);
  },           
  
  activateNodeIter : function (node, curInnerRepeat) {
    if ((!curInnerRepeat) || (curInnerRepeat.total >= 1)) { // restores it if current repetition nb >= 1
      xtdom.removeClassName(node, 'axel-repeat-unset'); 
    }
  },
                       
  // Removes the class 'axel-repeat-unset' on all the top elements of the slice at position index
  activateSliceAt : function (index) {
    this.mapFuncToSliceAt(xtiger.editor.Repeat.prototype.activateNodeIter, index, false);
  },

  // Transition from 1 item to 0 item (1st item is removed from the document)
  // Only for repeated elements with a min of 0 ! 
  setOption : function () {    
    this.total--;
    this.configureMenuForSlice (0);   
    this.unactivateSliceAt (0);
  },      
  
  unactivateNodeIter : function (node, curInnerRepat) {
    xtdom.addClassName(node, 'axel-repeat-unset'); 
    // if (curInnerRepat) { window.console.log('unactivate ' + curInnerRepat.label);  }
  },

  // Adds class 'axel-repeat-unset' on all the top elements of the slice at position index
  unactivateSliceAt : function (index) {
    this.mapFuncToSliceAt(xtiger.editor.Repeat.prototype.unactivateNodeIter, index, true);
  },
             
  /** 
   * Calls the method named 'action' on all the primitive editors in the 'top' tree
   * Passes the repeater to the action
   */
  callPrimitiveEditors : function (top, action) {             
    var treeWalker = xtiger.cross.makeTreeWalker (top, xtdom.NodeFilter.SHOW_ELEMENT,
        function (n) { 
            if (n.xttPrimitiveEditor && n.xttPrimitiveEditor.can && n.xttPrimitiveEditor.can(action)) {
              return xtdom.NodeFilter.FILTER_ACCEPT
            } else {
              return xtdom.NodeFilter.FILTER_SKIP; 
            }
        } );
    try {
      while(treeWalker.nextNode()) {
        treeWalker.currentNode.xttPrimitiveEditor.execute(action, this);
      }   
    } catch (e) {
      // xtiger.cross.log('error', 'Exception in tree walker');
    }
  }, 
    
  // Dispatches an event (which is converted to a builtin method call) on a slice
  dispatchEvent : function (slice, name) {
    var cur = slice[0];
    do {
      this.callPrimitiveEditors(cur, name);
      cur = cur.nextSibling;                          
    } while (cur && (cur != slice[1]));
  },  
  
  addItem : function (mark, position, useTrash) {    
    var saved, slice, end, n, newIndex, i;
    var preceeding = this.items[position];    
    if (useTrash) { // checks for a previously deleted item for this Repeater   
      for (i = 0; i < this.trash.length; i++) {
        if (this.trash[i][0] == this) {
          saved = this.trash[i];
          break;
        }
      }   
    }                                     
    this.originPosition = position; // set up origin for event dispacthing to primitive editors
    if (saved) { // pastes the latest deleted item from this Repeater
      newIndex = saved[2];
      slice = saved[1];     
      xtdom.moveNodesAfter (slice, preceeding[1]);
      this.trash.splice(i, 1);
      // TODO: 'pasted' event
    } else { // creates a default item (from the Repeater's model)
      newIndex = [null, null, null, null];
      n = this.getOneCopy (newIndex, position);
      xtdom.moveChildrenOfAfter (n, preceeding[1]);
    }          
    this.originPosition = -1;   
    this.plantSlice (newIndex, position);   
    this.total++; 
    // updates menu configuration for the 1st item, added item and last item        
    if (0 == position) {
      this.configureMenuForSlice (0); // configuration for 1st item
    }       
    this.configureMenuForSlice (position + 1); // configuration for added item            
    this.configureMenuForSlice (this.total-1); // configuration for last item   
    this.dispatchEvent(newIndex, 'duplicate'); // DEPRECATED
    if (!saved && $axel.binding) {
      $axel.binding.install(this.curDoc, newIndex[0], newIndex[1]);
    }
  },
  
  // FIXME: prevoir d'iterer sur tous les editeurs (choice, repeat, primitive) et d'appeler une methode
  // deleteEditor() pour qu'ils se désabonnent
  deleteItem : function (mark, position, useTrash) {
    this.removeItemAtIndex (position, useTrash);
    if (this.total <= 1) {
      this.configureMenuForSlice (0); // configures menu for 1st item
    } else {
      this.configureMenuForSlice (this.total-1); // configures menu for last item   
    }
  },

  removeLastItems : function (nb) {   
    while (nb-- > 0) {
      this.removeItemAtIndex(this.total-1, false); // FIXME: block 'remove' events
    }
    if (this.total <= 1) {
      this.configureMenuForSlice (0); // configures menu for 1st item
    } else {
      this.configureMenuForSlice (this.total-1); // configures menu for last item   
    }
  },

  removeItemAtIndex : function (position, useTrash) {   
    var cur, next;
    this.originPosition = position;     
    // must delete node between start and end
    var index = this.items[position];    
    var slice = useTrash ? [] : null;
    if (index[0] == index[1]) { // start == end  (i.e. the repeated use was auto-wrapped)
      if (useTrash) { slice.push (index[0]);  } 
      // this.callPrimitiveEditors(index[0], 'remove'); // DEPRECATED
      index[0].parentNode.removeChild(index[0]);      
    } else {
      // deletes the forest between index[0] and index [1], including themselves
      // PRE-CONDITION: works only if index[0] and index [1] are siblings ! (should be the case by construction)       
      // this.dispatchEvent(index, 'remove'); // DEPRECATED
      // do the real thing      
      next = index[0].nextSibling;
      if (useTrash) { slice.push (index[0]); }
      // this.callPrimitiveEditors(index[0], 'remove'); // DEPRECATED
      index[0].parentNode.removeChild(index[0]);
      while (next && (next != index[1])) {
        cur = next;
        next = next.nextSibling;
        if (useTrash) { slice.push (cur); }        
        // this.callPrimitiveEditors(cur, 'remove'); // DEPRECATED
        index[1].parentNode.removeChild(cur);
      }
      if (useTrash) { 
        slice.push (index[1]); 
      }
      index[1].parentNode.removeChild(index[1]);
    }  
    this.originPosition = -1;   
    this.items.splice(position, 1);  
    if (useTrash) { this.trash.push([this, slice, index]); }    
    this.total--;   
  },                                    
                              
  // Traverses each top node in the slice, and calls func on it iff it is an ELEMENT node
  // func should not change the slice 
  mapFuncToSliceAt : function (func, index) {    
    var cur, slice, curInnerRepeat, stackInnerRepeat;    
    var opened = 0;       
    slice = this.items[index]; // FIXME: no sanity check on index ?
    cur = slice[0];
    curInnerRepeat = null;
    if (slice[0] == slice[1]) { // manages the case when the slice starts and ends on the same node
      if (xtdom.ELEMENT_NODE == cur.nodeType) {
        func.call(this, cur, curInnerRepeat);     
      }
    } else {
      while (cur && (cur != slice[1])) {
        if (cur.startRepeatedItem && (cur.startRepeatedItem != this)) { // tracks inner repeat
          if (curInnerRepeat) { // there was already some, stacks them
            if (! stackInnerRepeat) {
              stackInnerRepeat = [ curInnerRepeat ];
            } else {
              stackInnerRepeat.push(curInnerRepeat);
            }
          }
          curInnerRepeat = cur.startRepeatedItem;
          if (cur.endRepeatedItem && (cur.endRepeatedItem == cur.startRepeatedItem)) { 
            // special case with an innerRepeat that starts and ends on the same node
            // we push it so that the next test will set curInnerRepeat to it
            if (! stackInnerRepeat) {
              stackInnerRepeat = [ curInnerRepeat ];
            } else {
              stackInnerRepeat.push(curInnerRepeat);
            }
          }
        }      
        if (cur.endRepeatedItem && (cur.endRepeatedItem != this)) {         
          if (stackInnerRepeat && (stackInnerRepeat.length > 0)) {
            curInnerRepeat = stackInnerRepeat.pop();
          } else {
            curInnerRepeat = null;
          }
        }
        if (xtdom.ELEMENT_NODE == cur.nodeType) {
          func.call(this, cur, curInnerRepeat);
        }
        cur = cur.nextSibling;
      } // FIXME: shouldn't we iterate too on the last slice ?
    }   
  }
}

// Resource registration
xtiger.resources.addBundle('repeat', 
  { 'plusIconURL' : 'plus.png',
    'minusIconURL'  : 'minus.png',  
    'uncheckedIconURL' : 'unchecked.png',
    'checkedIconURL' : 'checked.png'  } );
// file: axel/src/editor/classical/choice.js
/* ***** BEGIN LICENSE BLOCK *****
 *
 * @COPYRIGHT@
 *
 * This file is part of the Adaptable XML Editing Library (AXEL), version @VERSION@ 
 *
 * @LICENSE@
 *
 * Web site : http://media.epfl.ch/Templates/
 * 
 * Author(s) : Stephane Sire
 * 
 * ***** END LICENSE BLOCK ***** */

/*
 * Manages  the different types in an iterated component (a xt:use with multiple types)
 */
xtiger.editor.Choice = function () {
  this.items = [];
  // each of the type identified as { 'typeName' : [beginNode, endNode], ...  }
  this.curItem = -1; // special value (see selectChoiceItem)
  // this.items must be garnished by calling addItem (name, begin, end)
  this.curDoc = null; // will be in initFromTree or initFromSeed  
  xtiger.editor.Choice.prototype.UID++;   
}            

xtiger.editor.Choice.prototype = {  
  
  UID : 0,
  
  initFromTree : function (menu, types, doc) { 
    this.curDoc = doc;
    this.menu = menu; // select menu
    menu.markChoiceEditor = this; // for future cloning   
    this.types = types; // pre-condition: it must be an array ... coming from xtigercore.js
  },
  
  getTypes : function () {
    return this.types;
  },    

  getSelectedChoiceName : function () {
    return this.types[this.curItem];
  },
    
  // The seed is a data structure that should allow to "reconstruct" a cloned editor
  makeSeed : function () {
    if (! this.seed) {
      this.seed = [this.items.length, this.types, xtiger.editor.Choice.prototype.UID];
    }
    return this.seed;
  },
      
  // Clone this editor from another one
  // setChoiceMenu, setBeginChoiceItem and setEndChoiceItem should be called shortly after
  initFromSeed : function (editorSeed, doc) { 
    this.curDoc = doc;
    this.expectedLength = editorSeed[0];
    this.types = editorSeed[1];                   
  },
    
  setChoiceMenu : function (clone) { 
    this.menu = clone;
    this.awake(clone);
  },
  
  setBeginChoiceItem : function (clone) { 
    this.items.push ([clone, null]);
  },
  
  setEndChoiceItem : function (clone) { 
    this.items [this.items.length - 1][1] = clone;
    if (this.items.length == this.expectedLength) {
      // xtiger.cross.log('stack-trace', 'Choice initialization terminated after cloning, size=' + this.expectedLength);
      this.initializeSelectedItem (0);  // FIXME : check that it's not too early
    }
  },  
  
  awake : function (select) {
    var _this = this;
    xtdom.addEventListener (select, 'change', function (ev) { _this.handleSelect(ev); }, false);  
    if (xtiger.cross.UA.IE) { // https://github.com/ssire/axel/issues/23
      this.handleMouseEnter = function (event) {
        var cur = xtdom.getEventTarget(event).parentNode;
        while (cur && ((!cur.className) || cur.className.search('ie-select-hack') === -1)) {
          cur = cur.parentNode;
        }
        if (cur) {
          xtdom.addClassName(cur, 'hover');
        } else {
          xtdom.removeEventListener (select, 'mouseenter', _this.handleMouseEnter, false);
        }
        };
      this.handleMouseLeave =   function (event) { 
            var cur = xtdom.getEventTarget(event).parentNode;
            while (cur && ((!cur.className) || cur.className.search('ie-select-hack') === -1)) {
              cur = cur.parentNode;
            }
            if (cur) {
              xtdom.removeClassName(cur, 'hover');
            } else {
              xtdom.removeEventListener (select, 'mouseleave', _this.handleMouseEnter, false);
            }
            };
      xtdom.addEventListener (select, 'mouseenter', this.handleMouseEnter, false);
      xtdom.addEventListener (select, 'mouseleave', this.handleMouseLeave, false);
    }
  },
  
  addChoiceItem : function (name, begin, end) {
    // console.log('addChoiceItem name=' + name + ' start=' + begin.nodeName + ' end=' + end.nodeName);
    this.items.push([begin, end]);
    if (begin.beginChoiceItem) {
      xtiger.cross.log('warning', 'Choice <', name, '> ends with an already existing choice');
    }
    if (end.endChoiceItem) {
      xtiger.cross.log('warning', 'Choice <', name, '> ends with an already existing choice end');
    }
    begin.beginChoiceItem = this; // for future cloning   
    // begin.beginChoiceLabel = 'beginChoice ' + name; // DEBUG
    end.endChoiceItem = this; // for future cloning
    // end.endChoiceLabel = 'endChoice ' + name; // DEBUG
  },
      
  initializeSelectedItem : function (rank) {     
    // memorizes the state of the previous display style properties of everyone to be able to restore it
    for (var i = 0; i < this.items.length; i++) {
      var memo = [];
      var item = this.items[i];
      var begin = item[0];
      var end = item[1];
      var cur = begin;      
      memo.push(xtdom.getInlineDisplay(cur));
      if (i != rank) { // hides it
        if (cur.nodeType == xtdom.ELEMENT_NODE) cur.style['display'] = 'none';
      } 
      while (cur != end) {        
        cur = cur.nextSibling;
        memo.push(xtdom.getInlineDisplay(cur));       
        if (i != rank) { // hides it
          if (cur.nodeType == xtdom.ELEMENT_NODE) cur.style['display'] = 'none';
        }       
      }
      item.push (memo); // saves current state
    }
    this.curItem = rank;
  },
  
  // Changes class attribute of the node span corresponding to the type item 'name' so that it becomes visible
  // Changes class attribute of the previously visible type item 'name' so that it becomes invisible 
  selectChoiceItem : function (rank) {
    xtiger.cross.log('plant', 'Choice.selectChoiceItem ' + rank);
    // window.console.log('Choice.selectChoiceItem ' + rank + ' for ' + this.getTypes().join(' '));
    if (this.curItem == rank) return;
    if (this.curItem != -1) {
      // hides last selection
      var item = this.items[this.curItem];
      var begin = item[0];
      var end = item[1];
      var memo = [];
      var cur = begin;
      memo.push(xtdom.getInlineDisplay(cur));     
      if (cur.nodeType == xtdom.ELEMENT_NODE) cur.style['display'] = 'none';      
      while (cur != end) {        
        cur = cur.nextSibling;
        memo.push(xtdom.getInlineDisplay(cur));       
        if (cur.nodeType == xtdom.ELEMENT_NODE) cur.style['display'] = 'none';
      }   
      item[2] = memo; // replaces with current state
    }
    // shows current selection (i.e. restores the display style to what it was before)    
    var item = this.items[rank];
    var begin = item[0];
    var end = item[1];
    var memo = item[2];
    var i = 0;
    var cur = begin;
    if (cur.nodeType == xtdom.ELEMENT_NODE) cur.style['display'] = memo[i];
    while (cur != end) {        
      i++;
      cur = cur.nextSibling;
      if (cur.nodeType == xtdom.ELEMENT_NODE) cur.style['display'] = memo[i];
    }   
    this.curItem = rank;    
  },  
  
  selectChoiceForName : function (name) {   
    // xtiger.cross.log('plant', 'Choice.selectChoiceForName ' + name);   
    var i;
    for (i = 0; i < this.types.length; i++) {
      if (this.types[i] == name) {
        break
      }
    }
    if (i != this.types.length) {
      this.selectChoiceItem (i);
      xtdom.setSelectedOpt (this.menu, i);      
      return i;     
    } else {
      return this.curItem;
    }
  },
  
  // Menu event handler
  handleSelect : function (ev) {
    var option = xtdom.getSelectedOpt (this.menu);
    this.selectChoiceItem(option);
    
  }
}
// file: axel/src/editor/classical/keyboard.js
/* ***** BEGIN LICENSE BLOCK *****
 *
 * @COPYRIGHT@
 *
 * This file is part of the Adaptable XML Editing Library (AXEL), version @VERSION@ 
 *
 * @LICENSE@
 *
 * Web site : http://media.epfl.ch/Templates/
 * 
 * Author(s) : Stephane Sire, Antoine Yersin
 * 
 * ***** END LICENSE BLOCK ***** */

// open issue: should we create one keyboard instance per document or not ?

/**
 * Centralizes keyboard input among several input devices (e.g. each <input> or <textarea>)
 * This is useful in particular to factorize the tab management code
 * 
 * @class Keyboard
 */
xtiger.editor.Keyboard = function () {
  this.tabGroupManager = false;
  this.currentDevice = false;   
  this.allowRC = false;
}

// FIXME: dans register memoriser tous les abonnements pour les desabonner sur une method (reset)
// à appeler quand on change de document // frame (?)
xtiger.editor.Keyboard.prototype = {
    
    /**
     * 
     * @param t
     * @return
     */
  setTabGroupManager : function (t) {
    this.tabGroupManager = t;
  },
  
  /**
   * Allows a device to register to keyboard events on its handle.
   * 
   * @param {Device}
   *            aDevice
   * @param {DOMElement|DOMDocument}
   *            aAltHandle Optional. A handle listening to DOM events. If not
   *            submitted, the device's default handle (device.getHandle()) is
   *            used.
   * @return {[function]} Handler's references to unregister
   */
  register : function (aDevice, aAltHandle) {
    
    var _handle = aAltHandle ? aAltHandle : aDevice.getHandle();
    
    // closure variables
    var _this = this;
    var _device = aDevice;
    
    var _handlers = {
        keydown: function (ev) { _this.handleKeyDown(ev, _device) },
        keyup: function (ev) { _this.handleKeyUp(ev, _device) }
    }
    xtdom.addEventListener(_handle, 'keydown', _handlers.keydown, false);
    xtdom.addEventListener(_handle, 'keyup', _handlers.keyup, false);
    return _handlers;
  },
  
  /**
   * 
   * @param device
   * @param handlers
   * @return
   */
  unregister : function (aDevice, handlers, aAltHandle) {     
    var _handle = aAltHandle ? aAltHandle : aDevice.getHandle();
    xtdom.removeEventListener(_handle, 'keydown', handlers.keydown, false);
    xtdom.removeEventListener(_handle, 'keyup', handlers.keyup, false);
  },
  
  // Esc does not trigger keyPress on Safari, hence we need to intercept it with keyDown
  handleKeyDown : function (ev, device) {
    if (device.isEditing()) {
      if (this.tabGroupManager) {
        this.tabGroupManager.filterKeyDown(ev);
      }                              
      // On FF ctrlKey+ RC sends an event but the line break is not added to the textarea hence I have selected shiftKey                       
      var validate = (this.allowRC && (ev.keyCode == 13) && (! ev.shiftKey)) || ((!this.allowRC) && (ev.keyCode == 13));
      if (validate) {
        device.stopEditing(false);
        xtdom.preventDefault(ev); /* avoid triggering buttons in IE (e.g. Save button) */
      } else if (ev.keyCode == 27) {
        device.cancelEditing ();
      }     
      device.doKeyDown (ev);      
    } 
  },
  handleKeyUp : function (ev, device) {
    if (device.isEditing()) {
      if (this.tabGroupManager && this.tabGroupManager.filterKeyPress(ev)) {      
        xtdom.preventDefault(ev);
        xtdom.stopPropagation(ev);
      } else {
        device.doKeyUp (ev);
      }
    }
  },
  grab : function (device, editor) {
    if (this.tabGroupManager) {
      this.tabGroupManager.startEditingSession (editor);
      // window.console.log('TabGroupManager start editing ' + editor);
    }
  },
  release : function (device, editor) {
    if (this.tabGroupManager) {
      this.tabGroupManager.stopEditingSession ();
      // window.console.log('TabGroupManager stop editing');
    }
  },
  enableRC : function () {  
    this.allowRC = true;     
  }, 
  disableRC : function () {
    this.allowRC = false;
  }
}

// file: axel/src/editor/classical/tabgroupmgr.js
/* ***** BEGIN LICENSE BLOCK *****
 *
 * @COPYRIGHT@
 *
 * This file is part of the Adaptable XML Editing Library (AXEL), version @VERSION@ 
 *
 * @LICENSE@
 *
 * Web site : http://media.epfl.ch/Templates/
 * 
 * Author(s) : Stephane Sire
 * 
 * ***** END LICENSE BLOCK ***** */

/*
 * Manages tab navigation between basic string editors.
 */
xtiger.editor.TabGroupManager = function (rootNode) {
  this.root = rootNode;
  this.isChangingFocus = false;   
  this.direction = 0;
}

xtiger.editor.TabGroupManager.prototype = {
  
  startEditingSession : function (editor) {
    if (this.isChangingFocus) return; // guard
    this.tabs = [];   
    var treeWalker = xtiger.cross.makeTreeWalker (this.root, xtdom.NodeFilter.SHOW_ELEMENT,
        function (node) { 
            if (node.xttPrimitiveEditor && node.xttPrimitiveEditor.isFocusable()) {
              return xtdom.NodeFilter.FILTER_ACCEPT
            } else {
              return xtdom.NodeFilter.FILTER_SKIP; 
            }
        } );
    while(treeWalker.nextNode()) {
      // FIXME: how to avoid input nodes within unselected XttChoiceEditor control ?
      this.tabs.push(treeWalker.currentNode.xttPrimitiveEditor);    
    }   
    this.curEditor = editor;
  },

  stopEditingSession : function () {
    if (this.isChangingFocus) return; // guard
    this.tabs = undefined;
    this.curEditor = undefined;
  },
  
  // Intercepts Tab KeyDown events
  // Returns true if it has intercepted it
  filterKeyDown : function (ev) {       
    this.direction = 0; // For firefox
    if (ev.keyCode == 9) { // it's a Tab
        if (xtiger.cross.UA.gecko)  { // we must wait for KeyPress event because canceling will not work
          this.direction = ev.shiftKey ? -1 : 1;          
        } else { // we can act immediatly
          this._focusNextInput(ev.shiftKey ? -1 : 1);
        }               
        try {
          xtdom.preventDefault(ev);
          xtdom.stopPropagation(ev);
        } catch (e) {
          // on IE !          
        }
        return true
    } else {
      return false;
    }
  },      
  
  // For some certain kinds of browsers filterKeyDown does not cancel the Tab event
  // in that case we get a chance to modify its effect in KeyPress event handling
  // This is the case with Firefox (v2 on OS X at least)
  filterKeyPress : function (ev) {
    if (xtiger.cross.UA.gecko && (this.direction != 0)) {
      // window.console.log('Focused next input');
      return (this._focusNextInput(this.direction));
    }
    return false;
  },  
  
  _focusNextInput : function (direction) {
    var res = false;
    if (!this.tabs)
      return; // safety guard
    for (var i = 0; i < this.tabs.length; i++) {
      if (this.tabs[i] == this.curEditor) {
        break;
      }
    }
    if (i < this.tabs.length) {
      var next;
      if ((i + direction) < 0) {
        next = this.tabs.length - 1;
      } else {
        next = (i + direction) % this.tabs.length;
      }
      this.isChangingFocus = true;  
      this.tabs[i].unfocus();       
      this.tabs[next].focus ();
      this.isChangingFocus = false;
      this.curEditor = this.tabs[next];
      res = true;
    }        
    this.direction = 0;
    return res;
  } 
} 

// file: axel/src/editor/classical/xmlloader.js
/* ***** BEGIN LICENSE BLOCK *****
 *
 * @COPYRIGHT@
 *
 * This file is part of the Adaptable XML Editing Library (AXEL), version @VERSION@ 
 *
 * @LICENSE@
 *
 * Web site : http://media.epfl.ch/Templates/
 * 
 * Author(s) : Stephane Sire
 * 
 * ***** END LICENSE BLOCK ***** */

/**
 * Basic XML loading algorithm exposed as a loadData function
 * Starts iterating on any XTiger XML DOM tree which must have been transformed first 
 * Feed the tree with XML data stored in a DOMDataSource
 * You can share this class as it doesn't maintain state information between loadData calls
 */
xtiger.editor.BasicLoader = function () {
}

xtiger.editor.BasicLoader.prototype = {

  // walks through the tree and renders model data as it encounters it
  loadData : function (n, dataSrc) {
    var curSrc = dataSrc.getRootVector ();
    var stack = [ curSrc ];
    this.loadDataIter (n, dataSrc, stack);
  },

  // checks that all the repeated items have been consumed on the stack at the point
  hasDataFor : function (repeater, point, dataSrc) {
    var doMore = false;
    if (repeater.hasLabel()) { // in that case repeater Tag was popped out
      doMore = (0 != dataSrc.lengthFor(point));
    } else {
      doMore = dataSrc.hasDataFor(repeater.getRepeatableLabel(), point);
    }
    return doMore;
  },
        
  makeRepeatState : function (repeater, size, useStack, useReminder) {
    return [repeater, size, useStack, useReminder];   
  },
    
  loadDataSlice : function (begin, end, dataSrc, stack, point, origin, repeatedRepeater) {
    var repeats = [], // stack to track repeats
        cur = begin,
        go = true,
        next, // anticipation (in case repeatExtraData is called while iterating as it insert siblings)
        tmpState;
    while (cur && go) {     
      if (cur.startRepeatedItem && (cur.startRepeatedItem != repeatedRepeater)) {
        if ((repeats.length === 0) || ((repeats[repeats.length - 1][0]) !== cur.startRepeatedItem)) { // new repeat         
          // cur.startRepeatedItem.reset(); // resets repeat (no data) => cannot alter it while iterating !
          if (cur.startRepeatedItem.hasLabel()) {
            var nextPoint = dataSrc.getVectorFor (cur.startRepeatedItem.dump(), point);
            if ((nextPoint instanceof Array) && (dataSrc.lengthFor(nextPoint) > 0)) { // XML data available
              stack.push(nextPoint); // one level deeper
              point = nextPoint;
              tmpState = this.makeRepeatState(cur.startRepeatedItem, cur.startRepeatedItem.getSize(), true, true);
            } else { // No XML data available
              // xtiger.cross.log('debug', 'removing all slices at startRepeatedItem with a label');
              next = cur.startRepeatedItem.getLastNodeForSlice(cur.startRepeatedItem.getSize()).nextSibling; 
              // skips repeat, even if it has children, there's no need to traverse them as no slice is selected
              cur.startRepeatedItem.reset();
              cur = next;
              continue;
            }
          } else { 
            if (this.hasDataFor(cur.startRepeatedItem, point, dataSrc)) { //  XML data available
              tmpState = this.makeRepeatState(cur.startRepeatedItem, cur.startRepeatedItem.getSize(), false, true);
            } else {
              //xtiger.cross.log('debug', 'removing all slices at startRepeatedItem with a pseudoLabel');
              next = cur.startRepeatedItem.getLastNodeForSlice(cur.startRepeatedItem.getSize()).nextSibling; // skips repeat
              // skips repeat, even if it has children, there's no need to traverse them as no slice is selected
              cur.startRepeatedItem.reset();
              cur = next;
              continue;
            }
          }
          repeats.push(tmpState);
        }
      }
      
      // restricts iterations on the current chosen item (if it is in the point)
      if (cur.beginChoiceItem && (cur.beginChoiceItem != origin)) {
        var c = cur.beginChoiceItem;
        point = dataSrc.getVectorForAnyOf (c.getTypes(), point);  
        if (point instanceof Array) { // implies (point != -1)
          stack.push(point); // one level deeper
          var curItem = c.selectChoiceForName (dataSrc.nameFor(point));
          if (c.items[curItem][0] != c.items[curItem][1]) {
            this.loadDataSlice(c.items[curItem][0], c.items[curItem][1], dataSrc, stack, point, c); // [SLICE ENTRY]
            cur = c.items[c.items.length - 1][1]; // jumps to the last Choice item end boundary
            // in case it closes a label containing the choice, closes it 
            if ((cur.xttCloseLabel && (! cur.xttOpenLabel)) && (curItem != (c.items.length - 1))) {
              // this.loadDataIter (cur, dataSrc, stack); // the last Choice element may close a label
              stack.pop ();
              point = stack[stack.length -1]; 
            }                                         
          } else {          
            // a choice slice starts and end on the same node
            this.loadDataIter(c.items[curItem][0], dataSrc, stack);  // [SLICE ENTRY]
            stack.pop(); // restores the stack and the point  [SLICE EXIT]
            point = stack[stack.length -1];         
            cur = c.items[c.items.length - 1][1]; // jumps to the last Choice item end boundary           
          }
        } // otherwise do not change Choice content (no data)
      } else {
        // FIXME: see serializeDataIter
        this.loadDataIter (cur, dataSrc, stack); // FIXME: first interpretation
        point = stack[stack.length -1];
        if (origin) {  // checks if iterating on the current slice of a choice
          if (cur == origin.items[origin.curItem][1]) { // checks that the end of the slice/choice has been reached           
            stack.pop(); // restores the stack and the point
            point = stack[stack.length -1];         
            return;  // [SLICE EXIT] ~ internal repeats are closed by callee (because repeat is handled 1st)
                     // there may also be a label associated with the last Choice element that will be closed by callee
          }         
        }
        // FIXME: second interpretation
        // this.loadDataIter (cur, dataSrc, stack);
        // point = stack[stack.length -1]; // recovers the point as loadDataIter may change the position in the stack
      }       
      if (cur == end) {
        go = false;
      }               
      next = cur.nextSibling;
      
      // checks repeat section closing i.e. the last item has been traversed
      if (cur.endRepeatedItem && (cur.endRepeatedItem != repeatedRepeater)) { 
        tmpState = repeats[repeats.length - 1]; // current repeat state
        // if (cur.endRepeatedItem === tmpState[0])) {   // per-construction there can be only 1 repeat end by node
        tmpState[1] = tmpState[1] - 1; // 1 slice consumed
        if (tmpState[1] < 0) { // optional repeater (total = 0) was set during this iteration 
          if (cur.endRepeatedItem.getSize() == 0) {
            cur.endRepeatedItem.sliceLoaded();
          }
          // otherwise it has been configured/activated through autoSelectRepeatIter call
          // from a service filter set to askUpdate on load
        }
        if (tmpState[1] <= 0) { // all the items have been repeated (worth if min > 1)
          if (tmpState[3] && this.hasDataFor(cur.endRepeatedItem, point, dataSrc)) { // did we exhaust the data source ?
            var repeater = cur.endRepeatedItem;
            while (this.hasDataFor(repeater, point, dataSrc)) {
              // xtiger.cross.log('stack-trace', '>>[ extra ]>> start repetition for' + repeater.dump());   
              var tmpStack = [point]; // simulates stack for handling the repeated repeat
              var pos = repeater.appendSlice();
              var begin = repeater.getFirstNodeForSlice(pos);
              var end = repeater.getLastNodeForSlice(pos);
              this.loadDataSlice (begin, end, dataSrc, tmpStack, point, undefined, repeater);   
              repeater.sliceLoaded(); // 1 slice of extra data added to repeater during this iteration   
            }
          }
          if (tmpState[2]) {
            stack.pop(); // restores the stack and the point
            point = stack[stack.length -1];
          }
          repeats.pop();
        } else if (! this.hasDataFor(cur.endRepeatedItem, point, dataSrc)) { // remove extra slices
          // xtiger.cross.log('debug', 'removing ' + tmpState[1] + ' slices at endRepeatedItem modulus=' + tmpState[1]);
          next = cur.endRepeatedItem.getLastNodeForSlice(cur.endRepeatedItem.getSize()).nextSibling;
          cur.endRepeatedItem.removeLastItems(tmpState[1]);
          repeats.pop();
          if (tmpState[2]) { // FIXME: VERIFY THIS
            stack.pop(); // restores the stack and the point
            point = stack[stack.length -1];
          }
        }
        //}
      }
      cur = next;
    }   
  },
    
  // Manages xttOpenLabel, xttCloseLabel and atomic primitive editors
  // Recursively call loadDataSlice on the children of the node n 
  loadDataIter : function (n, dataSrc, stack) {
    var curLabel;
    var point = stack[ stack.length - 1 ];
    if (n.xttOpenLabel) {     
      curLabel = n.xttOpenLabel;
      var attr = false;
      // moves inside data source tree
      if (curLabel.charAt(0) == '@') {          
        point = dataSrc.getAttributeFor(curLabel.substr(1, curLabel.length - 1), point);
        attr = true;
      } else {
        point = dataSrc.getVectorFor(curLabel, point);
      }
      if (attr || ((point instanceof Array) && (dataSrc.lengthFor(point) > 0))) {
        stack.push(point); // one level deeper
      } else {
        // FIXME: handle optional element it (make them turned off)
        point = -1; // -1 for "End of Source Data" (xttCloseLabel should be on a sibling)
        stack.push(point);        
      }
    }
    if (n.xttPrimitiveEditor) {
      n.xttPrimitiveEditor.load (point, dataSrc);
      point = -1; // to prevent iteration on children of n below as n should be atomic
    }
    if (n.firstChild) {
        // FIXME: iterates on child even if point -1 to be robust to incomplete XML (not sure this is exactly required)
        this.loadDataSlice (n.firstChild, n.lastChild, dataSrc, stack, point);
    }
    if (n.xttCloseLabel) { 
      curLabel = n.xttCloseLabel;
      stack.pop ();
    }
  }   
}

// Registers as default XML loader (file must be included after generator.js)
xtiger.editor.Generator.prototype.defaultLoader = new xtiger.editor.BasicLoader ();

// file: axel/src/editor/classical/xmlserializer.js
/* ***** BEGIN LICENSE BLOCK *****
 *
 * @COPYRIGHT@
 *
 * This file is part of the Adaptable XML Editing Library (AXEL), version @VERSION@ 
 *
 * @LICENSE@
 *
 * Web site : http://media.epfl.ch/Templates/
 * 
 * Author(s) : Stephane Sire
 * 
 * ***** END LICENSE BLOCK ***** */

/**
 * Basic XML serialization algorithm exposed as a serializeData function
 * Starts iterating on any XTiger XML DOM tree which must have been transformed first 
 * Serializes data while iterating to a DOMLogger instance
 * You can share this class as it doesn't maintain state information between serializeData calls
 */    
xtiger.editor.BasicSerializer = function (baseUrl) {
}

xtiger.editor.BasicSerializer.prototype = {

	// Walks through the tree starting at n and renders model data as it encounters it
	// Accepts an optional rootTagName for the document, uses 'document' by default
	serializeData : function (n, logger, rootTagName) {
		logger.openTag(rootTagName || 'data');
		this.serializeDataIter (n, logger);
		logger.closeTag(rootTagName || 'data');	
	},
	
	// Manage the Choice current slice
	// origin is optional, it is the Choice editor from where a recursive call has been initiated
	serializeDataSlice : function (begin, end, logger, origin) {
		var repeats = []; // stack to track repeats		
		var cur = begin;
		var go = true;
		while (cur && go) {
			// manage repeats
			if (cur.startRepeatedItem) {
				if ((repeats.length == 0) || ((repeats[repeats.length - 1][0]) != cur.startRepeatedItem)) {
					// repeats.push ([cur.startRepeatedItem, cur.startRepeatedItem.getSize()]); // AAA
					if (cur.startRepeatedItem.getSize() == 0) { // nothing to serialize in repeater (min=0)   
						// jumps to end of the repeater
						cur = cur.startRepeatedItem.getLastNodeForSlice(0);						
						// in case cur has children, no need to serialize them as the slice is unselected (found on IE8)
						cur = cur.nextSibling;
						continue;							
					} else if (cur.startRepeatedItem.hasLabel()) {
							logger.openTag (cur.startRepeatedItem.dump());
					}  
					repeats.push ([cur.startRepeatedItem, cur.startRepeatedItem.getSize()]); // AAA					
				} 				
			}			
			if (cur.beginChoiceItem && (cur.beginChoiceItem != origin)) {
				var c = cur.beginChoiceItem;
				logger.openTag(c.getSelectedChoiceName()); // [OPEN -A- ]
				if (c.items[c.curItem][0] != c.items[c.curItem][1]) {
					this.serializeDataSlice(c.items[c.curItem][0], c.items[c.curItem][1], logger, c);				
				} else {
					// a choice slice starts and end on the same node
					this.serializeDataIter(c.items[c.curItem][0], logger);				
					// closes the choice
					logger.closeTag(c.getSelectedChoiceName()); // [CLOSE -A- ]									
				}
				cur = c.items[c.items.length - 1][1]; // sets cur to the last choice				
				// the last node of the Choice (if it was not active) may coincide with an xttCloseLabel
				// closes it as serializeDataIter will not be called on that node
				if (cur.xttCloseLabel && (c.curItem != (c.items.length - 1))) {
					logger.closeTag(cur.xttCloseLabel);
				}	                           		
			} else {
				// FIXME: we have an ambiguity <xt:use types="a b"><xt:use label="within_a"...
				// and <xt:use label="within_a"><xt:use types ="a b"....
				/// The current implementation will privilege First interpretation
				this.serializeDataIter (cur, logger);				// FIXME:  first interpretation
				if (origin) {  // we are iterating on the current slice of a choice 
					if (cur == origin.items[origin.curItem][1]) {
						// closes tag for the current choice (we must do it before serializeDataIter in case it closes a outer use)
						logger.closeTag(origin.getSelectedChoiceName()); // [CLOSE -A- ]									
					}					
				}
				// this.serializeDataIter (cur, logger);   // FIXME: second interpretation
			}			
			if (cur.endRepeatedItem) {
				if (true || (cur.endRepeatedItem == repeats[repeats.length - 1][0])) {
					--(repeats[repeats.length - 1][1]);
					if (repeats[repeats.length - 1][1] <= 0) { 
						if ((cur.endRepeatedItem.getSize() != 0) && (cur.endRepeatedItem.hasLabel())) {						
							logger.closeTag(cur.endRepeatedItem.dump());
						}
						repeats.pop();
					}
				}
			}			
			if (cur == end) {
				go = false;
			}
			cur = cur.nextSibling;
		}		
	},
	
	serializeDataIter : function (n, logger) { 
		var curLabel;
		if (n.xttOpenLabel) {            
			curLabel = n.xttOpenLabel;
			if (curLabel.charAt(0) == '@') {
				logger.openAttribute(curLabel.substr(1, curLabel.length - 1));				
			} else {
				logger.openTag(curLabel);
			}
		}
		if (n.xttPrimitiveEditor) {			
			// logger.write(n.xttPrimitiveEditor.dump());         
			n.xttPrimitiveEditor.save(logger);
		}		 
		// FIXME: do not need to call next line if xttPrimitiveEditor ?
		if (n.firstChild) {
			this.serializeDataSlice(n.firstChild, n.lastChild, logger);		
		}
		if (n.xttCloseLabel) {         
			curLabel = n.xttCloseLabel;
			if (curLabel.charAt(0) == '@') {
				logger.closeAttribute(curLabel.substr(1, curLabel.length - 1));				
			} else {
				logger.closeTag(curLabel);
			}
		}
	}
}

// Registers as default XML serializer (file must be included after generator.js)
xtiger.editor.Generator.prototype.defaultSerializer = new xtiger.editor.BasicSerializer ();


// file: axel/src/devices/text.js
/* ***** BEGIN LICENSE BLOCK *****
 *
 * @COPYRIGHT@
 *
 * This file is part of the Adaptable XML Editing Library (AXEL), version @VERSION@ 
 *
 * @LICENSE@
 *
 * Web site : http://media.epfl.ch/Templates/
 * 
 * Author(s) : Stephane Sire
 * 
 * ***** END LICENSE BLOCK ***** */

/*      
 * TextDevice is a controller class that manages interactions between an XTiger primitive editor, 
 * an input field wrapper (a class that wraps a DOM <input> or <textarea> used for input) and 
 * the keyboard manager for the application.
 * You need to instantiate only one TextDevice per type of primitive editor per document
 * 
 * @input is the wrapper of the HTML input field, which is either an <input> or a <textarea> element
 * @kbd is the keyboard manager
 * @doc is the document for which the TextDevice is instantiated   
 *                             
 * TODO
 * - find a way to put the cursor at the end of a textarea device (like input)
 */         
             
(function () {    

  /**
   * Private class that wraps a <div> element to be used with an edit field (textarea or input), 
   * in order to compute the text metrics for a given text extract and apply (some) of them 
   * to the edit field.The input field must grab / release the instance before making any computation 
   * so that the <div> element used for computation is inserted into the DOM to inherit the style attributes
   * before computing text metrics. The computation works only if the CSS attributes of the div 
   * (with a axel-text-shadowbuffer class) are set to inherit (cf. axel.css).
   *  
   * @class _TextMetrics
   */
  var _TextMetrics = function _TextMetrics (doc) {     
    // _TextMetrics Constructor code
    this.div = xtdom.createElement (doc, 'div');
    xtdom.addClassName(this.div, 'axel-text-shadowbuffer');
    this.divText = xtdom.createTextNode(doc, '');
    this.div.appendChild (this.divText);       
  }
  
  _TextMetrics.prototype = {
    
    // Sets initial bounding box constraints of the shadow <div> and on the handle
    setBBox : function setBBox (w, h, handle, shape, type) {
      var wpx = (w > 0) ? w + 'px' : '0px';
      var hpx = (h > 0) ? h + 'px' : '0px'; 
      this.lastWidth = w;
      this.lastHeight = h;

      // 1. initializes shadow div 
      if ((type == 'input') || (shape == 'self')) { // surface will grow horizontaly
        this.div.style.width = ''; 
        this.div.style.height = '';
      } else { // surface will grow vertically
        this.div.style.width = wpx; // blocks width to that value
        this.div.style.height = 'auto'; 
          // text will overflow verticaly once filled
          // 'auto' is required for FF and Opera
      }

      // 2. initializes text entry field
      handle.style.width = wpx;
      handle.style.height = hpx;
    },

    // Sets text content for which to compute metrics
    setText : function setText (text) {    
      this.divText.data = text + 'm';
      // FIXME: try with replaceData and appenData of CharacterData ?
    },

    // sets the width of the handle to the width of the shadow <div>
    adjustWidth : function adjustWidth (handle, exactMath) {     
      var w = wimp = Math.max(this.div.offsetWidth, this.div.clientWidth, this.div.scrollWidth);
      if (w > this.lastWidth) {
        if (! exactMath) {
          wimp = w - (w % 20)  + 20; // FIXME: +20 too empirical ?
        } else if (! xtiger.cross.UA.webKit) {
          wimp += 4; // assumes a 2px input field border (offsetWidth includes borders)
        }
        handle.style.width = wimp + 'px';
        this.lastWidth = w;
      }
    },

    // sets the height of the handle to the height of the shadow <div>
    adjustHeight : function adjustHeight (handle, init) {    
      var h = Math.max(this.div.offsetHeight, this.div.clientHeight, this.div.scrollHeight);
      if (h > this.lastHeight) {
        handle.style.height = h + "px";
        this.lastHeight = h;
      }    
    },

    grab : function grab (field) {     
      field.hook.appendChild(this.div);
    },

    release : function (field, willEditAgain) {   
      if (this.div.parentNode === field.hook) { // sanity check (IE)
        field.hook.removeChild(this.div);
      }
    }    
  };
  
  
  //////////////////////////////////////////////////////////
  //                   TextDevice                        ///
  //////////////////////////////////////////////////////////
  
  xtiger.editor.TextDevice = function (input, kbd, doc) {
    this.keyboard = kbd;
    this.field = input; // managed input field wrapper  
    // assigns unique object per-document for text metrics computations
    this.metrics = xtiger.session(doc).load('metrics');
    if (! this.metrics) {  
      this.metrics = new _TextMetrics (doc);
      xtiger.session(doc).save('metrics', this.metrics);
    }
    this.currentEditor = null;
    var _this = this; // event callback to subscribe / unscribe later
    this.blurHandler = function (ev) { _this.handleBlur(ev); }; 
  }; 

  xtiger.editor.TextDevice.prototype = {

    // Returns the DOM input field managed by the device (should be a <textarea> or an <input>)
    getHandle : function () {
      return this.field.getHandle();
    },   
  
    // Returns true if the text is actually editing data (hence its DOM input field is visible)
    isEditing : function () {
      return (null != this.currentEditor);
    },     
      
    // Returns the cursor offset inside the entry field or -1 if it fails
    _computeOffset : function (mouseEvent, editor) {  
      var offset = -1;
      var selObj, selRange;
      // the following code used to work at least on Firefox
      // but for now the getRangeAt(0) throws an exception because there are no range defined for a click !
      if (window.getSelection && (editor.getParam('clickthrough') === 'true')) {
        selObj = window.getSelection();  
        if (selObj && (selObj.rangeCount > 0)) {     
          selRange = selObj.getRangeAt(0);
          if (selRange) {
            offset = selRange.startOffset;     
          }
        }
      }
      return offset;
    },
  
    ////////////////////////////////
    // Core methods
    ////////////////////////////////    
  
    startEditing : function (editor, mouseEvent, doSelectAll) {  
      var ghost, // node to use for geometry computation when shape="parent"
          offset; // initial cursor position (-1 means at the end)
      var constw, consth;
      var shape;
      var redux = false;
      var handle = this.field.getHandle();
      var coldStart = false;
    
      if (this.currentEditor) { 
        // another editing was in progress with the same device
        // this is unlikely to happen as when directly clicking another field will trigger unfocus first
         this.stopEditing (true);
      } else {
        // registers to keyboard events
        this._kbdHandlers = this.keyboard.register(this);
        this.keyboard.grab(this, editor);
        // transfers class attribute
        if (editor.getParam('hasClass')) {
          xtdom.addClassName(handle, editor.getParam('hasClass'));
        }
        // saves cursor offset (where the user has clicked)
        if ((!doSelectAll) && mouseEvent) { 
          offset = this._computeOffset(mouseEvent, editor);
        }
        coldStart = true;
        this.field.show (editor);
      }
    
      this.currentEditor = editor;
      ghost = editor.getGhost();
    
      // computes current geometry of the editor to apply it to the buffer later on
      constw = Math.max(ghost.offsetWidth, ghost.clientWidth, ghost.scrollWidth);
      consth = Math.max(ghost.offsetHeight, ghost.clientHeight, ghost.scrollHeight);
      // installs the input field which may change the DOM and break editor.getGhost()
      this.field.grab (editor);  
      this.metrics.grab(this.field); // to get same CSS properties
    
      if (editor.getParam('enablelinebreak') == 'true') {
        this.keyboard.enableRC();
      }
      
      // cursor positioning and initial text selection
      if (doSelectAll) {
        if ((editor.getParam('placeholder') !== 'clear') || mouseEvent.shiftKey) {
          xtdom.focusAndSelect(handle);
        } else {
          handle.value = '';
          try { handle.focus(); } catch (e) {}
        }
      } else if (offset && (offset !== -1)) {        
        xtdom.focusAndMoveCaretTo(handle, offset);
      } else {
        xtdom.focusAndMoveCaretTo(handle, handle.value.length);
      }

      shape = this.currentEditor.getParam('shape');
      if (shape.charAt(shape.length - 1) == 'x') { // a bit tricky: shape=parent-XXXpx
        var m = shape.match(/\d+/);
        if (m) {
          constw = constw - parseInt(m[0]);
          redux = true;
        }
      }       
                  
      // applies initial geometry to the input field handle                                                              
      this.metrics.setBBox (constw, consth, handle, shape, this.field.deviceType);
      this.metrics.setText(this.field.getValue());
      // always adjusts dimensions since input field has a border the span handle didn't have
      this.metrics.adjustWidth(handle, ((this.field.deviceType === 'textarea') && (shape === 'parent')));
      this.metrics.adjustHeight(handle);
      if (coldStart) {
        // must be called at the end as on FF 'blur' is triggered when grabbing
        xtdom.addEventListener(handle, 'blur', this.blurHandler, false);
      }
    },  
  
    /**
     * Stops the edition process on the current model
     * 
     * @param willEditAgain
     * @param isCancel
     */
    stopEditing : function (willEditAgain, isCancel) {
      if (! this.currentEditor)
        return;
      if (! this.stopInProgress) {  
        // FIXME: guarded because in some cases (for instance if printing an alert for debugging)
        // stopEditing maybe called twice as the blurHandler is triggered even if removed in 1st call
        this.stopInProgress = true; 
        var model = this.currentEditor; // simple alias                              
        this.currentEditor = null;        
        this.field.release(model, willEditAgain); // releases the input field wrapper
        this.metrics.release(this.field);
        if (! isCancel) {
          model.update(this.field.getValue()); // updates model with new value
        }
        if (! willEditAgain) {  // uninstalls text device             
          if (model.getParam('enablelinebreak') == 'true') {
            this.keyboard.disableRC();
          }                                                 
          // FIXME: uncomment these lines if the 'release' extension is used from filters ?
              // if (model.can('release')) { // gives a chance to the filter to restore keybord behavior
              //   model.execute('release', [this.keyboard, this]);
              // }
          this.keyboard.unregister(this, this._kbdHandlers);
          this.keyboard.release(this, model);           
          xtdom.removeEventListener(this.getHandle(), 'blur', this.blurHandler, false);
          if (model.getParam('hasClass')) {
            xtdom.removeClassName(this.getHandle(), model.getParam('hasClass'));
          }
        }
        // this.field.release(model, willEditAgain); // releases the input field wrapper
        // this.currentEditor = null;
        this.stopInProgress = false;
      }
    },
  
    getCurrentModel: function () {
      return this.currentEditor;
    },
  
    cancelEditing : function () {
      this.stopEditing(false, true);
    },
  
    handleBlur : function (ev) {    
      this.stopEditing (false);
    },  
  
    doKeyDown : function (ev) { 
      if (this.currentEditor && (this.currentEditor.getParam('expansion') == 'grow')) {
        this.curLength = this.field.getValue().length; // to detect paste in doKeyUp
        this.adjustShape ();                    
      }                
    },    
  
    doKeyUp : function (ev) { 
      if (this.currentEditor && this.currentEditor.can('onkeyup')) {
        this.currentEditor.execute('onkeyup', this.field.getHandle());
      }
      if (this.currentEditor && (this.currentEditor.getParam('expansion') == 'grow')) {     
        if (this.field.getValue().length > (this.curLength + 1)) { // paste detection
          this.adjustShape();
          // => ca ne marche pas, comment déclencher un refresh de l'affichage ?
        }
      }   
    },  
    
    adjustShape : function () {                 
      this.metrics.setText(this.field.getValue());
      var h = this.field.getHandle();
      this.metrics.adjustWidth(h);
      if (this.field.deviceType == 'textarea') {
        this.metrics.adjustHeight(h);
      } 
    }
  };                
                      
  //////////////////////////////////////////////////////////
  //                   Floating Field                    ///
  //////////////////////////////////////////////////////////
         
/**
 * FloatingField is a wrapper for an HTML element used for text input that can be shared 
 * between all the XTiger editors of a given document. This input field will "float"
 * on top of the primitive editor when the user activates editing mode.
 * You need to instantiate only one FloatingField of each kind for each document
 *
 * @kind is the type of HTML element used for input ('textarea' or 'input')          
 */
xtiger.editor.FloatingField = function (kind, doc) {
  this.deviceType = kind;          
  this.handle = this.createHandleForDoc (kind, doc);
  this.hook = xtdom.createElement (doc, 'div');
  xtdom.addClassName(this.hook, 'axel-text-container'); 
  this.hook.appendChild(this.handle);  
  this.hook.style.display = 'none';
};
          
xtiger.editor.FloatingField.prototype = {

  // Creates an HTML input field to be controlled by a device
  createHandleForDoc : function (kind, doc) {   
    var device = xtiger.session(doc).load('ff_' + kind);
    if (! device) {
      // creates the shared <input> or <textare> DOM node for editing
      // var body = doc.getElementsByTagName('body')[0]; // FIXME: body or BODY ? (use a hook for insertion ?)
      device = xtdom.createElement (doc, kind);
      xtdom.addClassName(device, 'axel-text-float');
      // body.appendChild (device);
      xtiger.session(doc).save('ff_' + kind, device);
    }
    return device;
  },  
  
  // Returns the DOM element used for editing (basically a <textarea> or <input>)
  getHandle : function () {
    return this.handle;
  },           

  getValue : function () {
    return this.handle.value;
  },

  show : function () {
    this.hook.style.display = 'inline';
  },

  // Inserts as first child into the handle a hook which is an inline div container 
  // styled as a relative positioned element that contains an input or textarea 
  // edit field positioned as absolute    
  // FIXME: hides the handle during editing
  grab : function (editor) {
    var delta;
    this.handle.value = editor.getData();
    this.editorHandle = editor.getHandle();
    if (this.editorHandle.getClientRects) {
      delta = this.editorHandle.getClientRects()["0"].left - this.editorHandle.parentNode.getBoundingClientRect().left;
      this.handle.style.left = (0 - delta) + 'px';
    }
    this.editorHandle.parentNode.insertBefore (this.hook, this.editorHandle); 
      // FIXME: before and not inside 1st child, not all styling will reach it (e.g. <pre>)
    this.editorHandle.style.visibility = 'hidden';
    // DEPRECATED: var ghost = editor.getGhost(); // moves the handle at the ghost position    
    // this.setPosition (ghost); 
  },

  // Removes the first child that was inserted inside the handle 
  // Restore the visibility of the handle
  release : function (editor, willEditAgain) {   
    if (this.hook.parentNode === this.editorHandle.parentNode) { // sanity check (IE)
      this.editorHandle.parentNode.removeChild(this.hook);
    }
    editor.getHandle().style.visibility = 'visible';
    if (! willEditAgain) {
      this.hook.style.display = 'none';
    }                
  },
  
  setPosition : function (ghost) {  
    var pos = xtdom.findPos(ghost);
    with (this.handle.style) {
        left = pos[0] + 'px';
        top = pos[1] + 'px';
    }      
  }
                                
};

//////////////////////////////////////////////////////////
//                Placed Field                         ///
//////////////////////////////////////////////////////////

xtiger.editor.PlacedField = function (kind, doc) {
  this.myDoc = doc;
  this.deviceType = kind;          
  this.handle = this.createHandleForDoc (kind, doc);
  this.handle.style.display = 'none';  
  this.cache = {};
  this.hook;
};

xtiger.editor.PlacedField.prototype = {
  
  // Static method that creates the HTML input field (the handle)
  // FIXME: where to insert the editor into the target documentation + 'body' or 'BODY' ?
  createHandleForDoc : function (kind, doc) {   
    var device = xtiger.session(doc).load('pf_' + kind);
    if (! device) {
      // creates the shared <input> or <textarea> DOM node for editing
      device = xtdom.createElement (doc, kind);
      xtdom.addClassName(device, 'axel-text-placed');
      xtiger.session(doc).save('pf_' + kind, device);
    }          
    return device;
  },
  
  // Returns the DOM element used for editing (basically a <textarea> or <input>)
  getHandle : function () {
    return this.handle;
  },           

  getValue : function () {
    return this.handle.value;
  },

  show : function (editor) {             
    this.handle.style.display = 'inline';    
  },           
        
  // Replaces the handle with a hook that has the same root element as the handle
  // and that contains an input or textarea edit field
  grab : function (editor) {     
    var _htag;
    this.handle.value = editor.getData();
    this.editorHandle = editor.getHandle();
    _htag = xtdom.getLocalName(this.editorHandle); 
    if (! this.cache[_htag]) {
      this.hook = xtdom.createElement(this.myDoc, _htag);
      this.cache[_htag] = this.hook;
    } else {
      this.hook = this.cache[_htag];
    }
    var parent = this.editorHandle.parentNode;  
    if (this.hook.firstChild != this.handle) {
      this.hook.appendChild(this.handle);
    }
    parent.insertBefore (this.hook, this.editorHandle, true);
    parent.removeChild(this.editorHandle);   
  },
          
  // Restores the handle that was replaced in release
  release : function (editor, willEditAgain) {   
    var parent = this.hook.parentNode;      
    parent.insertBefore (this.editorHandle, this.hook, true);
    parent.removeChild(this.hook);
    if (! willEditAgain) {
      this.handle.style.display = 'none';
    }         
  }
};           

/* Manages dynamic creation of TextDevice with different parameters
 * There is one TextDeviceFactory per application
 */
xtiger.editor.TextDeviceFactory = function () {
  this.devKey = 'TextDeviceCache';
  //this.filters = {}; // filter constructors
} 

xtiger.editor.TextDeviceFactory.prototype = {  
  
  // Gets or create cache to store devices on a per-document basis
  _getCache : function (doc) {
    var cache = xtiger.session(doc).load(this.devKey);
    if (! cache) {
      cache = {'input' : { 'float' : null, 'placed' : null},
               'textarea' : { 'float' : null, 'placed' : null},
           'filtered' : {} // instantiated filtered devices per-document
          };
      xtiger.session(doc).save(this.devKey, cache);
    }
    return cache;
  },
  
  // filter is an optional filter name (which must have been registered with registerFilter)
  getInstance : function (doc, type, layout) {
    // Parameters sanitization      
    var t = type || 'input';
    if ((t != 'input') && (t != 'textarea')) {
      xtiger.cross.log('error', "AXEL error : unkown text device type '" + t + "' requested !");
      t = 'input';
    }
    var l = layout || 'placed';
    if ((l != 'float') && (l != 'placed')) {
      xtiger.cross.log('error', "AXEL error : unkown text device layout '" + l + "' requested !");
      l = 'float';
    }     
    // Get or create device corresponding to parameters
    var cache = this._getCache(doc);
    var fConstructor;
    var device = cache[t][l];
    if (! device) {
      var wrapper = (l == 'float') ? new xtiger.editor.FloatingField (t, doc) : new xtiger.editor.PlacedField (t, doc);
      device =  new xtiger.editor.TextDevice (wrapper, xtiger.session(doc).load('keyboard'), doc);  
      if (fConstructor) {
        device.addFilter( fConstructor(doc) ); // create and add filter (1 filter per device type per document)
      }
      cache[t][l] = device; // stores device for reuse in same document
    }
    return device;
  }
} 

xtiger.registry.registerFactory('text-device', new xtiger.editor.TextDeviceFactory());           

})();

// file: axel/src/devices/popup.js
/* ***** BEGIN LICENSE BLOCK *****
 *
 * @COPYRIGHT@
 *
 * This file is part of the Adaptable XML Editing Library (AXEL), version @VERSION@ 
 *
 * @LICENSE@
 *
 * Web site : http://media.epfl.ch/Templates/
 * 
 * Author(s) : Stephane Sire, Antoine Yersin
 * 
 * ***** END LICENSE BLOCK ***** */

/**    
 * PopupDevice displays a popup menu.     
 * You should create only one device per-document which can be shared between multiple editor's
 */
xtiger.editor.PopupDevice = function (aDocument) {
  
  this._document = aDocument;
  
  // device's edition handle 
  this._menu = xtiger.session(aDocument).load('popupmenu'); // shared on a per-document basis
  if (!this._menu) {
    this._menu = new xtiger.editor.PopupMenu(aDocument);
    xtiger.session(aDocument).save('popupmenu', this._menu);
  }
  
  // a reference to the keyboard device
  this._keyboard = xtiger.session(aDocument).load('keyboard');
  
  // the currently edited model
  this._currentModel = null;
  
  //  handlers for keyboard events
  this._keyboardHandlers = null;
  
  this._currentSelection = null;
  
  // event callback to subscribe / unscribe later
  var _this = this; 
  this.clickHandler = function(ev) {
    _this.handleClick(ev);
  };
}

xtiger.editor.PopupDevice.prototype = {   
  
  MAX_HEIGHT : 150, // FIXME: should become a popup_max_heigth parameter
  
  /**
   * Displays the popup menu below the editor's handle
   * Available choices are listed in choices with the current one in curSel
   */
  startEditing : function(aModel, aChoices, aSelection, aHandle) {
    var coldStart = true;
    var popupDiv = this._menu.getHandle();
    
    if (this._currentModel != null) {
      // another editing was in progress with the same device
      this.stopEditing(true);
      coldStart = false;
    }     
    
    // Resets Width/Height constraints that will be adjusted after display                                
    popupDiv.style.width = '';
    popupDiv.style.maxHeight = this.MAX_HEIGHT + 'px'; // will be adjusted later

    this._menu.setOptions(aChoices, aSelection);
    this._menu.setPosition(aHandle);
    if (coldStart) {
      this._menu.show();
      // to detect click or lost of focus
      xtdom.addEventListener(this._document, xtiger.cross.events.DOWN, this.clickHandler, true); 
      // registers to keyboard events
      this._keyboardHandlers = this._keyboard.register(this, this._document);
    }
    this._currentModel = aModel;
    this._currentSelection = null; 
    
    // Width/Height adjustments
    try {
          this._menu.adjustHeight(popupDiv, this.MAX_HEIGHT);          
          if (this._menu.isScrollbarInside()) {
            this._menu.adjustWidthToScrollbar(popupDiv);
        }                
    } catch (e) { /* nop */ }
  },

  /**
   * Stops the edition process. Updates the model if this is not a cancel.
   * If willEditAgain the device is kept visible and awakened to events
   * If isCancel is true the model is not updated nor set.
   */
  stopEditing : function (willEditAgain, isCancel) {
    // Safety guard in case of consecutive stops (may arise in case of chaned device, such as with the autocomplete)
    if (!this._currentModel) 
      return;
    
    // Updates the model
    if (!isCancel) {
      if (this.getSelection()) {
        if (this._currentModel.onMenuSelection)
          this._currentModel.onMenuSelection(this.getSelection()); // FIXME: deprecated (update select.js)
        else
          this._currentModel.update(this.getSelection());
      }
    }
    
    // Uninstalls text device
    if (!willEditAgain) { 
      xtdom.removeEventListener(this._document, xtiger.cross.events.DOWN, this.clickHandler, true);
      this._menu.hide();
      
      // Unregisters to keyboard events
      this._keyboard.unregister(this, this._keyboardHandlers, this._document);
    }
    
    // Sets the editor FIXME deprecated ! (an update should )
    if ((!isCancel) && (this._currentModel.isOptional)
        && (!this._currentModel.isSelected)) {
      if (this._currentModel.setSelectionState)
        this._currentModel.setSelectionState(true);
      else
        this._currentModel.set(); 
    }
    
    // Releases the device
    this._currentModel = null;
  },
  
  /**
   * Cancels the edition process, that is, releases the device without
   * updating the model.
   */ 
  cancelEditing : function() {
    this.stopEditing(false, true);
  },
  
  /**
   * Returns true if the device is in an edition process.
   */
  isEditing : function () {
    return this._currentModel ? true : false;
  },
  
  /////////////
  // Getters //
  /////////////

  /**
   * Returns the currently selected item
   */
  getSelection : function() {
    return this._currentSelection;
  },
  
  /**
   * Sets the currently selected item
   */
  setSelection : function(aSelection) {
    this._currentSelection = aSelection;
  },
  
  /**
   * Retruns the 
   */
  getHandle : function () {
    return this._menu.getHandle();
  },
  
  /////////////////////
  // Event listeners //
  /////////////////////

  /**
   * Hnadler for the click event on the document while the popup menu is
   * active (displayed). Catches the event and delegates its actual handling
   * to the popup menu (the object who wraps the HTML structure).
   */
  handleClick : function (ev) {
    this._menu.handleClick(ev, this);
  },
  
  /**
   * Handler for keyboard events. Mainly listen for up and down arrows, escape
   * or return keystrockes.
   */
  doKeyDown : function (aEvent) {
    switch (aEvent.keyCode) {
    case 38 : // arrow up
      this._menu.selectPrev();
      xtdom.preventDefault(aEvent);
      xtdom.stopPropagation(aEvent);
      break;
    case 40 : // arrow down
      this._menu.selectNext();
      xtdom.preventDefault(aEvent);
      xtdom.stopPropagation(aEvent);
      break;
    default :
      // nope
    }
    this._currentSelection = this._menu.getSelected();
  },
  
  /**
   * Handler for keyboard events. Mainly listen for up and down arrows, escape
   * or return keystrockes.
   */
  doKeyUp : function (aEvent) {
    // nope
  }
}


/**
 * Utility class to wrap the DOM construction
 */
xtiger.editor.PopupMenu = function(aDocument) {
  
  this._document = aDocument;
  this._handle = this._createMenuForDoc(aDocument);
  this._handle.style.visibility = 'hidden';
  
   // Position (from 0 to length-1) of the selected choice. 
   // If -1, no element is selected
  this._currentSelection = -1;
  
  // current options *values* displayed by the menu
  this._options = null;
}

xtiger.editor.PopupMenu.prototype = {

  // Creates the DOM elements (the handle) to display the choices.
  _createMenuForDoc : function(aDocument) {
    var body = aDocument.getElementsByTagName('body')[0]; // FIXME: body or BODY ? (use a hook for insertion ?)
    var device = xtdom.createElement(aDocument, 'div');
    xtdom.addClassName(device, 'axel-popup-container'); // Must be positioned as absolute in CSS !!!
    body.appendChild(device);
    return device;
  },
  
  /**
   * Creates a &gt;li&lt; element to insert into the popup menu.
   * 
   * @param {any|{value:any,display:InnerHTML}|{section:[...], header: InnerHTML}}
   *            aOption The option value from which build a HTML element. This
   *            value may be of three different kind:
   *            - a single value: the displayed value is returned to the model
   *            when selected.
   *            - a pair display/value: the popup element shows the display
   *            field but returns the value to the model.
   *            - a section (hash): defines a section. The hash contains one mandatory
   *            field, section, which contains an array of option, one optional, header,
   *            which contains a valid html string to use as a section's header.
   * @param {[HTMLElement]}
   *            aOptionsList The list of options for this menu. Passed as
   *            parameter such as option element (li element that are a choice
   *            in the list) can add themselves in that list.
   * @return {HTMLElement} a &lt;li&gt; element to insert in the list
   */
  _createMenuElement: function (aOption, aOptionsList) {
    var _li = xtdom.createElement(this._document, 'li');
    _li.isNestedList = false; // Only true for sub list (as in a segmented list)
    switch (typeof aOption) {
    case 'object' : 
      if (aOption.value && aOption.display) {
        _li.selectionvalue = aOption.value;
        xtdom.addClassName(_li, 'axel-popup-selectable');
        aOptionsList.push(_li);
        try {
          _li.innerHTML = aOption.display;
        }
        catch (_err) {
          xtiger.cross.log('warning', 'The following text is not proper HTML code ' +
              "\n\t" + '"' + aOption.display + '"' + "\n\t" +
              'Cause : ' + _err.message);
          var _text = xtdom.createTextNode(this._document, aOption.display);
          _li.appendChild(_text);
        }
        break;
      }
      else if (aOption.section) { // Nested list (header is optional)
        _li.selectionvalue = null; // No value for a section
        _li.isNestedList = true;
        try {
          _li.innerHTML = '<table class="axel-popup-sublist"><tbody><tr>' +
            '<td class="axel-popup-sublistheader"></td>' + 
            '<td class="axel-popup-sublistbody"><ul style="margin-left:0"></ul></td>' + 
            '</tr></tbody></table>'; // margin-left: for IE8            
          _header = _li.firstChild.firstChild.firstChild.firstChild;
          _body = _header.nextSibling.firstChild;
          if (aOption.header) {
            _header.innerHTML = aOption.header;
          }
          for (var _i = 0; _i < aOption.section.length; _i++) {
            var _subelement = this._createMenuElement(aOption.section[_i], aOptionsList); // Recurse
            _body.appendChild(_subelement);
          }
        }
        catch (_err) {
          xtiger.cross.log('warning', 'The following text is not proper HTML code ' +
              "\n\t" + '"' + aOption.header + '"' + "\n\t" +
              'Cause : ' + _err.message);
          var _text = xtdom.createTextNode(this._document, aOption.display);
          _li.appendChild(_text);
        }
        break;
      }
    case 'string' :
    default:
      _text = xtdom.createTextNode(this._document, aOption);
      _li.selectionvalue = aOption;
      _li.appendChild(_text);
      xtdom.addClassName(_li, 'axel-popup-selectable');
      aOptionsList.push(_li);
    }
    return _li;
  },

  _setPositionXY : function(x, y) {
    with (this._handle.style) {
      left = x + 'px';
      top = y + 'px';
    }
  },

  /**
   * Returns the menu's handle (i.e. the html top container of the popup menu)
   */
  getHandle : function() {
    return this._handle;
  },

  ////////////////////////////////////////////////////////////////
  // Methods controlling the appearance of the popup menu device
  ////////////////////////////////////////////////////////////////
  
    // Returns true if the browser displays scroll bars inside their container 
    // false if it adds them outside
    isScrollbarInside : function() {    
      return xtiger.cross.UA.gecko || xtiger.cross.UA.webKit || xtiger.cross.UA.IE;
    },
                                     
  // Detects if there is a scrollbar, adjusts the handle width in case it's inside
  // also adjusts width in case the scrollbar would be out of the window
    adjustWidthToScrollbar : function(n) { 
      var tmp, 
      sbWidth = 20, // scrollbar width (FIXME)
      rightMargin = 10 + sbWidth; // includes potential window scroll bar
      // space we would like to leave to the right of the popup in case it touches the border
      // note that depending on the browser it may include the window scrollbar itself
  
      if (n.scrollHeight > n.clientHeight) { // tests if there is a scrollbar
          // adjusts width so that scrollbar is inside the window
      // also adjusts it so that there is a little space left on the right
          var pos = xtdom.findPos(n);
          var size = xtdom.getWindowLimitFrom(n);             
          var freeV = size[0] - pos[0] - rightMargin;
          tmp = ((n.scrollWidth + sbWidth) < freeV) ? n.scrollWidth + sbWidth : freeV;
          n.style.width = tmp + 'px';
      } 
    // FIXME: we should also adjusts width to apply rightMargin in case there is no scrollbar
    },  
                           
  // Adjusts the height of the handle taking as much space is available till the bottom 
  // of the window or max otherwise
    adjustHeight : function(n, max) { 
      var curMaxH,                     
      bottomMargin = 20,
      newMaxH = max;
      var pos = xtdom.findPos(n);
      var size = xtdom.getWindowLimitFrom(n);             
      var freeH = size[1] - pos[1] - bottomMargin;
    if ((freeH < n.clientHeight) || (n.scrollHeight > n.clientHeight)) { // not engouh space to show all popup
    newMaxH = (freeH > max) ? freeH : max;  // don't go below max height
    newMaxH = newMaxH + 'px';
      curMaxH = n.style.maxHeight || '';
      if (curMaxH != newMaxH) {      
      n.style.maxHeight = newMaxH;
      }    
    }
    },    

  /**
   * Initialize popup menu content with options and creates as many <li> as necessary
   */
  setOptions : function(aOptions, aSelection) {
    this._currentSelection = -1;
    this._options = [];
    this._handle.innerHTML = '<ul style="margin-left:0"></ul>'; // margin-left: for IE8
    for (var _i = 0; _i < aOptions.length; _i++) {
      var _opt = this._createMenuElement(aOptions[_i], this._options);
      if (aSelection && _opt.selectionvalue == aSelection) {
        xtdom.addClassName(_opt, 'selected');
      } else {
        xtdom.removeClassName(_opt, 'selected');
      }
      this._handle.firstChild.appendChild(_opt);
    }
  },

  /** 
   * Position the menu just below the provided handle (an HTML DOM node)
   */
  setPosition : function(aHandle) {
    var pos = xtdom.findPos(aHandle); // FIXME use another positionment algo
    this._setPositionXY(pos[0], aHandle.offsetHeight + pos[1])
  },

  /**
   * Select the next element in the list
   * @TODO: manage sub lists
   */
  selectNext : function () {
    if (this._currentSelection != -1)
      xtdom.removeClassName(this._options[this._currentSelection], 'selected');
    this._currentSelection++;
    this._currentSelection %= (this._options.length);
    xtdom.addClassName(this._options[this._currentSelection], 'selected');
  },

  /**
   * Select the previous element in the list
   * TODO: manage sub lists
   */
  selectPrev : function () {
    if (this._currentSelection != -1)
      xtdom.removeClassName(this._options[this._currentSelection], 'selected');
    else
      this._currentSelection = 1;
    this._currentSelection--;
    if (this._currentSelection < 0)
      this._currentSelection = this._options.length - 1;
    xtdom.addClassName(this._options[this._currentSelection], 'selected');
  },
  
  /**
   * Returns the value of the currently selected element, if any. If none,
   * returns false. Returns the value of the selected element or false
   */
  getSelected : function () {
    if (this._currentSelection == -1)
      return false;
    var _sel = this._options[this._currentSelection];
    if (_sel.value)
      return _sel.selectionvalue;
    return _sel.firstChild.data;
  },
  
  /**
   * Shows the popup menu
   */
  show : function() {
    this._handle.style.visibility = 'visible';
  },

  /**
   * Hides the popup menu
   */
  hide : function() {
    this._handle.style.visibility = 'hidden';
  },
   
  /**
   * Analyses the event provided as parameter and returns the selected option
   * as a string if the event is targeted at one of the menu options. Returns
   * false otherwise.
   */
  handleClick : function (aEvent, aDevice) {
    // find the first <li> target in event target ancestors chain
    var target = xtdom.getEventTarget(aEvent);
    // xtiger.cross.log('debug', 'peekEvent(' + xtdom.getLocalName(target) + ')');
    while (target.parentNode) {
      if (xtdom.getLocalName(target).toLowerCase() === 'li' && target.selectionvalue) {
        aDevice.setSelection(target.selectionvalue);
        xtdom.preventDefault(aEvent);
        xtdom.stopPropagation(aEvent);
        aDevice.stopEditing(false, false);
        return;
      }
      if (target == this._handle) {
        return; // Do nothing
      }
      target = target.parentNode;
    }
    // Out of the device, stops the event and the edition process
    xtdom.preventDefault(aEvent);
    xtdom.stopPropagation(aEvent);
    aDevice.stopEditing(false, true);
  }
}

// file: axel/src/devices/lens.js
/* ***** BEGIN LICENSE BLOCK *****
 *
 * @COPYRIGHT@
 *
 * This file is part of the Adaptable XML Editing Library (AXEL), version @VERSION@ 
 *
 * @LICENSE@
 *
 * Web site : http://media.epfl.ch/Templates/
 * 
 * Author(s) : Stephane Sire, Antoine Yersin
 * 
 * ***** END LICENSE BLOCK ***** */              
    
/**
* <p>
* A LayoutManager encapsulates different algorithms for dynamically replacing
* a Model Handle with an editor. Once the layout manager is invoked with a layout
* method such as insertAbove or insertInline, it retains a state which is restored
* with a call to restoreHandle. So basically a possible use is to encapsulate 
* one layout manager per device. 
* </p>
* 
* @class LayoutManager
*/
xtiger.editor.LayoutManager = (function LayoutManager() {
  
  /* trick to reserve the lens size into the document */    
  var _fakeDiv; // iff display="inline"
  
  /* Outer container for positioning above a model's handle */
  var _posContainer; 
  
  var _document;
  
  /*
   *  Lazy creation of _fakeDiv
   */
  var _initFakeDiv = function _initFakeDiv() {
    _fakeDiv = xtdom.createElement(_document, 'img');
    _fakeDiv.setAttribute('src', xtiger.bundles.lens.whiteIconURL); // FIXME: use a "lens" bundles ?
    // _fakeDiv.style.verticalAlign = "top"; // FIXME: style could be "copied" from the editor handle
  }
  
  return function(aDocument) {   
                     
    _document = aDocument;
    _posContainer = xtdom.createElement(aDocument, 'div');
    xtdom.addClassName(_posContainer, 'axel-layout-container');
    
    this.getFakeDiv = function() {
      if (! _fakeDiv) {
        _initFakeDiv();
      }
      return _fakeDiv;
    };

    this.getLayoutHandle = function() {                         
      return _posContainer;
    };
    
  }

})();   

xtiger.editor.LayoutManager.prototype = { 
                                                         
  // Computes the style distance for aNode set in aDirection
  // Returns a number or 0 if aDirection  is 'auto' it will return 0
  // e.g.: _getDistanceFor(handle, 'top')
  _getDistanceFor : function(aNode, aDirection) {
    var style = xtdom.getComputedStyle(aNode, aDirection),        
        tmp = style.match(/\d*/),
        value = (tmp && tmp[0] && (tmp[0] != '')) ? parseInt(tmp) : 0; 
    return (! isNaN(value)) ? value : 0;
  },
  
  /*
   * For a given model, computes the left and top offsets for the positionable div
   * 
   * @return {int[]} the left and top offset, in an array
   */
   _getOffset : function (aTarget) {
    var _topOffset = 0,
        _leftOffset = 0,
        _hmt, 
        _hml;     
    switch (xtdom.getComputedStyle(aTarget, 'position')) {
      case 'absolute': // unsupported
      case 'fixed': // unsupported
        break;
      case 'relative':
        _topOffset = this._getDistanceFor(aTarget, 'top');
        _leftOffset = this._getDistanceFor(aTarget, 'left');   
        // fall through !
      case 'static':
      default:                    
        _hmt = this._getDistanceFor(aTarget, 'margin-top');
        _hml = this._getDistanceFor(aTarget, 'margin-left');
        _topOffset += (_hmt > 0) ? _hmt : 0;
        _leftOffset += (_hml > 0) ? _hml : 0;
    }                          
    return [_leftOffset, _topOffset];
  },     
        
  _confirmInsertion : function(aModelHandle) {
    var doIt = (! this.curHandle) || (this.curHandle != aModelHandle);
    if (this.curHandle && (this.curHandle != aModelHandle)) { 
      // already in use with another handle, restores it first 
      this.restoreHandle();
    }
    return doIt;
  },
    
  // Gets the display property from a handle and applies it to the top container
  _setDisplay : function (top, aSrcHandle) {
    var _disp = xtdom.getComputedStyle(aSrcHandle, 'display');
    _disp = (/^block$|^inline$/.test(_disp)) ? _disp : 'block';
    top.style.display = _disp;      
  },    
  
  // That methods requires specific axel-layout-container CSS rules in axel.css 
  _setOrigin : function (top, offset, padding) {
    // applies left margin because even 'auto' left margins are not applied
    top.style.left = '' + (offset[0] - padding[0]) + 'px';
    // does not apply top margin because we need to filter getComputedStyle
    // results to detect those who are due to 'auto' margins
    // actually only IE returns 'auto' when no margins have been set
    top.style.top = '' + (offset[1] - padding[1]) + 'px';
  },       
  
  _insert : function(aStyle, aModelHandle, aLensContent, aPadding, aGrabCallback) {
    var top, offset, img,
        padding = aPadding,
        doit = this._confirmInsertion(aModelHandle);
    if (doit) {
      top =  this.getLayoutHandle();
      offset = this._getOffset(aModelHandle);
      this._setDisplay(top, aModelHandle); // FIXME: useless ?
      top.style.visibility = 'hidden';
      if (aStyle == 'above') {
        // inserts the lens inside the document
        aModelHandle.parentNode.insertBefore(top, aModelHandle);
      } else {
        img = this.getFakeDiv();
        // replaces handle with empty image that will "reserve" space
        aModelHandle.parentNode.replaceChild(img, aModelHandle);
        img.parentNode.insertBefore(top, img);        
      }
      // inserts wrapper top level element inside lens 
      top.appendChild(aLensContent);
      if (aGrabCallback)
        padding = aGrabCallback();
      this._setOrigin(top, offset, padding);  
      top.style.visibility = 'visible';
      this.curDisplay = aStyle;
      this.curHandle = aModelHandle;      
      this.curLensContent = aLensContent;
    }
    return doit;
  },
   
  insertAbove : function(aModelHandle, aLensContent, aPadding, aGrabCallback) {
    this._insert('above', aModelHandle, aLensContent, aPadding, aGrabCallback);
  }, 
  
  // Replaces the model handle by the lens container filled 
  // with the lens content, followed by an empty image
  // This works only if the model handle is an inline element 
  insertInline : function(aModelHandle, aLensContent, aPadding, aGrabCallback) { 
    var bbox, w, h, img;
    if (this._insert('inline', aModelHandle, aLensContent, aPadding, aGrabCallback)) {
      // adjusts space filler
      bbox = aLensContent.getBoundingClientRect(); 
      w = bbox ? (bbox.right - bbox.left) : 1;
      h = bbox ? (bbox.bottom - bbox.top) : 1;
      img = this.getFakeDiv();      
      img.style.width = w  + 'px';
      img.style.height = h  + 'px';  
    }
  },
  
  // Restores editor handle view
  restoreHandle : function () { 
    var img;
    if (this.curHandle) {
      if (this.curDisplay == 'inline') {                        
        img = this.getFakeDiv();        
        img.parentNode.replaceChild(this.curHandle, img);
      } else {
        this.curHandle.style.visibility = 'visible';
      }
      xtdom.removeElement(this.curLensContent);
      xtdom.removeElement(this.getLayoutHandle()); // FIXME opera inserts a <br> tag !
      this.curHandle = this.curDisplay = this.curLensContent = undefined;
    }
  }
  
}

/**
 * <p>
 * LensDevice
 * </p>
 * 
 * @class LensDevice
 */
xtiger.editor.LensDevice = function (aDocument) {

  /* the document containing the device */
  var _document = aDocument;

  /* reference to the keyboard device */
  var _keyboard = xtiger.session(aDocument).load('keyboard');

  /* This is a reference to the current edited model (editor in Stephane's terminology) */
  var _currentModel;
  
  /* Currently used lens content wrapper */
  var _currentLCW;

  /* Current lens wrapper top container */
  var _lensView;
  
  /* Layout manager that caches the editor model when it is removed from the DOM */
  var _layoutManager;
  
  /* default values for lens parameters (in case they are not defined in the editor/model) */
  var _defaultParams = {
    trigger : 'click', // 'click' or 'mouseover' DOM events (see awake)     
    display : 'above',
    padding : "10px"
  };
  
  /* To desactivate lens mouse out detection when homing back from a modal dialog */
  var _checkMouseReturn = false;
  
  /* If true, the wrapper is never released. The value is set with the keepAlive() method */
  var _keepAlive = false;
  
  /* closure variable */
  var _this = this;
  
  /* named event handlers */
  var _dismissHandlers = {
    'click' : ['click', function (ev) { _this._onClick(ev) }],
    'mouseover' : ['mousemove', function (ev) { _this._onMouseMove(ev) }]
  };
  
  /*
   * Returns the parameter holds by the given model
   */
  var _getParam = function(name, aModel) {
    return (aModel.getParam && aModel.getParam(name)) || _defaultParams[name];
  };
  
  var _getLayoutManager = function() {
    if (! _layoutManager) {
      _layoutManager = new xtiger.editor.LayoutManager(_document);
    }
    return _layoutManager; 
  };
  
  var _getWrapperFor = function(aName) {   
    var w = xtiger.factory('lens').getWrapper(_document, aName);    
    if (!w) {
      xtiger.cross.log('warning', 'Missing wrapper "' + aWrapperName + '" in lens device, startEditing aborted')
    }
    return w;
  };
  
  var _grabWrapper = function(aDeviceLens, aWrapperName, doSelect, aPadding) {    
    var res;
    try {
      res = _currentLCW.grab(aDeviceLens, doSelect, aPadding);      
    } catch (e) {
      xtiger.cross.log('error ( ' + e.message + ' ) "', aWrapperName + '" failed to grab the lens device, startEditing compromised' );
    }                                                         
    return res || aPadding;
  };
  
  var _terminate = function(that, doUpdateModel) {
    if (! that.isEditing())
        return; // was not in an edition process

    if (_currentLCW.isFocusable()) {
      _keyboard.unregister(that, that._handlers);
    }     
    _getLayoutManager().restoreHandle();

    // end of event management to control when to dismiss the lens
    var mode = _getParam('trigger', _currentModel);
    if (_dismissHandlers[mode]) { 
      xtdom.removeEventListener(_document, _dismissHandlers[mode][0], _dismissHandlers[mode][1], true);
      _checkMouseReturn = false;
    }
          
    if (doUpdateModel) {
      // transfers data from the lens to the editor model
      _currentModel.update(_currentLCW.getData());
    }

    // release MUST make the lens invisible
    // not that this is not symmetrical with grab as it was done in the layout manager
    _currentLCW.release();

    // resets lens sate
    _currentModel = null;     
    _currentLCW = null;
    _lensView = null;    
  }; 
      
  /* ##################################
   * ###### EDITION PROCESS MGMT ######
   */
  
  /**
   * Starts an edition process on the given model, using the lens content
   * specified in parameter.
   * 
   * @param {Model}
   *            aModel A model containing the data to edit
   * @param {string}
   *            aWrapperName The name of the lens content to use
   * @param {boolean}
   *            aDoSelect Select the field at grabbing time
   */
  this.startEditing = function startEditing (aModel, aWrapperName, aDoSelect) {   
    // xtiger.cross.log('debug', 'startEditing');
    var display, tmp, padding, mode;   
    var doSelect = aDoSelect ? true : false; // sanitization
    
    if (this.isEditing())
      this.stopEditing();     
    _currentLCW = _getWrapperFor(aWrapperName);   
    if (_currentLCW) {
      _currentModel = aModel;
      
      // keyboard focus management
      if (_currentLCW.isFocusable()) {
        this._handlers = _keyboard.register(this);
        _keyboard.grab(this, aModel);
      }               
                              
      // extracts desired padding for the model parameters
      tmp = _getParam('padding', aModel).match(/\d*/)[0];
      tmp = (padding && padding != '') ? parseInt(padding) : 10; 
      padding = [tmp, tmp];
      
      // replaces handle with lens and asks wrapper to grab the device
      _lensView = _currentLCW.getHandle();
      display = _getParam('display', _currentModel)
      if (display == 'above') {
        _getLayoutManager().insertAbove(_currentModel.getHandle(), _lensView, padding,
          function() { return _grabWrapper(_this, aWrapperName, doSelect, padding) }); 
      } else if (display == 'inline') {
        _getLayoutManager().insertInline(_currentModel.getHandle(), _lensView, padding, 
          function() { return _grabWrapper(_this, aWrapperName, doSelect, padding) });
      } else {
         xtiger.cross.log('error', 'unkown display "' + display + '" in lens device, startEditing compromised');
      }                                   
      
      // activates wrapper
      _currentLCW.activate(this, aDoSelect);
      
      mode = _getParam('trigger', aModel);
      if (_dismissHandlers[mode]) { 
        // currently we do our own event peeking at the document level !
        xtdom.addEventListener(_document, _dismissHandlers[mode][0], _dismissHandlers[mode][1], true);
        _checkMouseReturn = false;
      } else {
        xtiger.cross.log('error', 'unkown trigger mode "' + mode + '" in lens device, startEditing compromised');
      } 
    }
  };

  /**
   * <p>
   * Stops the edition process on the current model. Fetches the data from
   * the device and update the model.
   * </p>
   */
  this.stopEditing = function stopEditing () {
    // xtiger.cross.log('debug', 'stopEditing');
    _terminate(this, true); 
  };
  
  /**
   * <p>
   * Stops the current editing process without making any changes to the
   * model. A further version may even want to restore the "original"
   * state of the model, that is, the state the model had at device's
   * grabbing time.
   * </p>
   */
  this.cancelEditing = function cancelEditing () {
    _terminate(this, false); 
  };

  /**
   * <p>
   * Returns true if the device is in an edition process, false otherwise.
   * </p>
   * 
   * @return {boolean} True if the device is editing
   */
  this.isEditing = function isEditing () {
    return _currentModel ? true : false;
  };
  
  /**
   * <p>
   * Returns the handle of the device if the later is in an edition
   * process. Returns null otherwise. The handle is the one belonging to
   * the editing facility, not the one belonging to the model.
   * </p>
   * 
   * @return {HTMLElement} The handle of the wrapped field
   */
  this.getHandle = function getHandle () {
    if (_currentLCW)
      return _currentLCW.getHandle();
    return null;
  };
  
  /**
   * <p>
   * Returns the current model using this device, null if the device is
   * unused.
   * </p>
   * 
   * @return {Model} The model using this device
   */
  this.getCurrentModel = function getCurrentModel () {
    if (_currentModel)
      return _currentModel;
    return null;
  };
  
  /**
   * <p>
   * The method is used to tell the device to stay alive whatever event
   * may occurs, at the exception of the grabbing of the device by another
   * model.
   * </p>
   * 
   * @param {boolean}
   *            aAlive If true, the device stays alive even if the events
   *            tells it to disappear
   */
  this.keepAlive = function keepAlive (aAlive) {
    _keepAlive = aAlive;
  };

  /* ##############################
   * ###### EVENTS LISTENERS ######
   */
  
  this._onClick = function (ev) {
    if(_keepAlive)
      return;
    // any click outside of the _lensView will stop editing
    var outside = true;
    var target = xtdom.getEventTarget(ev);
    while (target.parentNode) {
      if (target == _lensView) {
        outside = false;
        break;
      }       
      target = target.parentNode;
    } 
    if (outside) { // FIXME: not sure what happens if the user clicked on another lens
      this.stopEditing();
    }
  };

  /**
   *  Handler to detect when the mouse is leaving the lens
   */   
  this._onMouseMove = function (ev) {
    if(_keepAlive || (! _lensView))
      return;
    var _mouseX = ev.clientX;
    var _mouseY = ev.clientY;
    var _bb = _lensView.getBoundingClientRect();
    if (_checkMouseReturn) {
      if (! (_bb.left > _mouseX || _bb.top > _mouseY || _bb.right <= _mouseX || _bb.bottom <= _mouseY)) {
        _checkMouseReturn = false; // ok mouse is back
      }
    } else if (_bb.left > _mouseX || _bb.top > _mouseY || _bb.right <= _mouseX || _bb.bottom <= _mouseY) {
      this.stopEditing();
      xtdom.stopPropagation(ev);        
    }
  }

  this.doKeyUp = function doKeyUp (ev) {
    // nope
  };
  
  /**
   * Handler for intercepting arrow keys' actions. Asks the lens content wrapper to toggle between
   *the fields.
   *
   * @param {KeyboardEvent} ev The event where to fetch the key code
   */
  this.doKeyDown = function doKeyDown (ev) {
    if (!this.isEditing())
      return; // Safety guard
    if (ev.keyCode == "38" || ev.keyCode == "40")
      _currentLCW.toggleField();
    if (ev.keyCode == "27") // ESC
      this.cancelEditing();
    xtdom.stopPropagation(ev);
  };
  
  // A wrapper should call this method in case it opens a modal dialog box that may cause 
  // the mouse to move outside the lens (e.g. an input form file input dialog)
  // In that case the device should be careful not to close the lens when the mouse is moving out
  this.mouseMayLeave = function mouseMayLeave () {
    _checkMouseReturn = true; // Flag set to not dismiss lens on mouse move
  };
  
}

/** 
 * <p>
 * Manages dynamic creation of LensDevice, one per application.
 * </p>
 * 
 * @class LensDeviceFactory
 */
xtiger.editor.LensDeviceFactory = function () {
  this.devKey = 'LensDeviceCache';
  this.wrappers = {}; // wrapper constructors
} 

xtiger.editor.LensDeviceFactory.prototype = {
  
  /* 
   * Gets or create cache to store devices and wrappers on a per-document basis
   * @private
   */
  _getCache : function (doc) {
    var cache = xtiger.session(doc).load(this.devKey);
    if (! cache) {
      cache = {'device' : null,
               'wrappers' : {} // instantiated wrappers per-document
          };
      xtiger.session(doc).save(this.devKey, cache);
    }
    return cache;
  },
  
  /**
   * <p>
   * Registers a lens wrapper <em>factory</em> for the lens device.
   * </p>
   *  
   * @param {string} aKey
   * @param {function} aWrapperFactory
   * 
   * @see #getWrapper()
   */
  registerWrapper : function (aKey, aWrapperFactory) {
    if (this.wrappers[aKey]) {
      xtiger.cross.log('error', "Error (AXEL) attempt to register an already registered wrapper : '" + aKey + "' with 'lens' device !");
    } else {
      this.wrappers[aKey] = aWrapperFactory;
    }
  },
  
  /**
   * 
   * @param {DOMDocument} aDocument 
   * @param {string} aKey
   * @return {LensWrapper}
   */
  getWrapper : function (aDocument, aKey) {
    var cache = this._getCache(aDocument);
    var wrapper = cache['wrappers'][aKey];
    if (! wrapper) {
      var wConstructor = this.wrappers[aKey]; // Checks that constructor is known
      if (wConstructor) {
        wrapper = cache['wrappers'][aKey] = wConstructor(aDocument);
      }
    }
    if (! wrapper) {
      xtiger.cross.log('error', "Error (AXEL) : unkown wrapper '" + aKey + "' requested in 'lens' device !");
    }
    return wrapper;
  },
  
  /**
   * <p>
   * Gets the device's instance. At first call, the device is instanciated
   * and the created object is stored. This object will be returned for
   * every further calls given <em>the same document</em>. That is to
   * say, one device is (lazily) created per document.
   * </p>
   * 
   * @param {DOMDocument}
   *            aDocument A DOM document to contain the device
   * @return {LensDevice} The device for the given document
   */
  getInstance : function (aDocument) {
    var cache = this._getCache(aDocument);
    var device = cache['device'];
    if (! device) {
      device = cache['device'] = new xtiger.editor.LensDevice(aDocument);       
    }
    return device;
  }
}

// Resource registration
xtiger.resources.addBundle('lens', 
  { 'whiteIconURL' : 'white.png' } );

xtiger.registry.registerFactory('lens', new xtiger.editor.LensDeviceFactory()); 
// file: axel/src/devices/upload.js
/* ***** BEGIN LICENSE BLOCK *****
 *
 * @COPYRIGHT@
 *
 * This file is part of the Adaptable XML Editing Library (AXEL), version @VERSION@ 
 *
 * @LICENSE@
 *
 * Web site : http://media.epfl.ch/Templates/
 * 
 * Author(s) : Stephane Sire
 * 
 * ***** END LICENSE BLOCK ***** */


(function () { 

  // Creates and manages several potentially parallel data uploading processes
  // Manages a pool of Upload objects, queues request to upload and serve them one at a time
  // Possibility to serve in parallel (asynchronous)
  function UploadManager (doc) {
    var _this = this;
    // this.inProgress = []; // uploading
    // this.queued = []; // waiting for uploading
    this.inProgress = null;
    this.available = []; // available
    this.curDoc = doc;
    this.polllCounter = -1;
    this.onPoll = function() { _this.poll(); };
  }

  UploadManager.prototype = {
  
    _reset : function (uploader) {
      if (this.inProgress !== uploader) { alert('Warning: attempt to close an unkown transmission !')}
      uploader.reset();
      this.available.push(uploader);
      this.inProgress = null;
    },
  
    // Returns an available uploader to an editor which can use it to upload a file
    getUploader : function () {
      return (this.available.length > 0) ? this.available.pop() : new FileUpload(this);
    },
  
    // Returns true if the manager is ready to transmit (no other transmission in progress)
    isReady : function () {
      return (null === this.inProgress);
    },
  
    // Returns false if uploader is null or if it is currently not transmitting
    // Returns true if it is actually transmitting
    isTransmitting : function (uploader) {
      return (uploader && (uploader === this.inProgress));
    },
  
    // Limitation: this works only if the library and the transformed template are in the same window
    // and only if upload are serialized one at a time
    startPolling : function () {
      var f = frames['xt-photo-target'];
      if (f && f.document && f.document.body) {
        f.document.body.innerHTML = 'WAITING';
        setTimeout(this.onPoll, 500);
        this.polllCounter = 0;
      }
    },
    
    poll : function () {
      var txt,
          f = frames['xt-photo-target'];
      if (this.pollCounter !== -1) {
        if (f && f.document && f.document.body) {
          txt = f.document.body.textContent || f.document.body.innerText;
        }
        if (txt != 'WAITING') {
          this.reportEoT(0, txt);
        } else {
          setTimeout(this.onPoll, 500);
        }
      }
    },
  
    stopPolling : function () {
     this.pollCounter = -1;
    },
  
    // Asks the manager to start uploading data with the given uploader
    // The manager may decide to queue the transmnission
    startTransmission : function (uploader, client) {
      // var key = this._genTransmissionKey();
      this.inProgress = uploader; // only one at a time
      // as there may be an error while starting we save inProgress before
      if (uploader.dataType === 'form') {
        this.startPolling();
      }
      uploader.start(client);
    },

    startPreflight : function (uploader, client) {
      this.inProgress = uploader; 
      uploader.preflight(client);   
    },

    // Must be called by the target iframe at the end of a transmission
    // status 1 means success and in that case result must contain either 
    // a string with the URL of the photo (for displaying in handle)
    // or a hash with 'url' and 'resource_id' keys
    // status 0 means error and in that case result is an explanation
    // FIXM: currently only one transmission at a time (this.inProgress)
    reportEoT : function (status, result) {
      this.stopPolling();
      if (this.inProgress === null) { // sanity check
        // maybe the transmission was simply cancelled hence we cannot say...
        // alert('Warning: attempt to report an unkown file upload termination !');
      } else {
        if (status == 1) {
          this.notifyComplete(this.inProgress, result);
        } else {
          this.notifyError(this.inProgress, 0, result); // code not used (0)
        }
      }
    },
    
    notifyComplete : function (uploader, result) {
      var tmp = uploader.client;
      this._reset (uploader);
      tmp.onComplete (result); // informs client of new state   
    },  

    // FIXME: code not used
    notifyError : function (uploader, code, message) {    
      var tmp = uploader.client;
      this._reset (uploader);
      tmp.onError (message, code); // informs client of new state
    },
  
    // Asks the manager to cancel an ongoing transmission
    cancelTransmission : function (uploader) {
      var tmp = uploader.client;
      uploader.cancel();   
      this._reset(uploader);
      tmp.onCancel(); // informs client of new state 
    }     
  }

  // Simple XHR based file upload
  // See https://developer.mozilla.org/en/Using_files_from_web_applications
  FileUpload = function (mgr) {
    this.manager = mgr; 
    this.xhr = null;   
    this.defaultUrl = "/upload"; // FIXME: default action URL
  }

  FileUpload.prototype = {
  
    reset : function() {
      delete this.url;
    },
  
    setDataType : function (kind) {
      this.dataType = kind; // 'form' or 'formdata'
    },
  
    // Sets the url of the server-side upload script, should be on the same domain
    setAction : function(aUrl) {
      this.url = aUrl;
    },
    
    getClient : function () {
      return this.client;   
    },
  
    setClient : function (c) {
      this.client = c;    
    },  
  
    start : function (client) {
      this.client = client;
      try {
        if (this.dataType === 'formdata') { 
          this.startXHRForm();
        // } else if (this.dataType == 'dnd') {
        //   this.startXHR();
        } else {
          var form = this.client.getPayload();
          if (this.url) {
            xtdom.setAttribute(form, 'action', this.url);
          } else if (! form.getAttribute('action')) {
            xtdom.setAttribute(form, 'action', this.defaultUrl);
          }
          form['documentId'].value = this.client.getDocumentId() || 'noid';
          form.submit(); // Form based upload
        }   
      } catch (e) {
        this.manager.notifyError(this, e.name, e.message); // e.toString()
      }
    },
  
    // Use this protocol to check a resource name does not already exists client side before submitting
    // FIXME: - couldn't we use a HEAD request ?
    //        - factorize with startXHRForm ?
    preflight : function (client) {
      this.client = client;
      var formData, id, key, options;
      this.xhr = new XMLHttpRequest();  // creates one request for each transmission (not sure XHRT is reusable)
      this.isCancelled = false;
      var _this = this;
      //xtiger.cross.debug('Start preflight request to the server...');
      this.xhr.onreadystatechange = function () {
        if (_this.isCancelled) return;
          if (4 === _this.xhr.readyState) {
            if (200 === _this.xhr.status) { // OK
              _this.manager.notifyComplete(_this, _this.xhr.responseText);
            } else { // Most probably 409 for Conflict
              _this.manager.notifyError(_this, _this.xhr.status, _this.xhr.responseText);
            }
          }
      }
      try {
        this.xhr.open("POST", this.url || this.defaultUrl, true); // asynchronous
        formData = new FormData();
        var options = client.getPreflightOptions();
        for (k in options) {
          formData.append(k, options[k]);  
        }
        this.xhr.send(formData);
      } catch (e) {
        this.manager.notifyError(this, e.name, e.message); // e.toString()
      }
    },
  
    // Sends file with Ajax FormData API
    startXHRForm : function () {
      var formData, id;
      this.xhr = new XMLHttpRequest();  // creates one request for each transmission (not sure XHRT is reusable)
      this.isCancelled = false;
      var _this = this;
      //xtiger.cross.debug('Start file upload to the server...');
      this.xhr.onreadystatechange = function () {
        if (_this.isCancelled) return;
          if (4 === _this.xhr.readyState) {
            if (201 === _this.xhr.status) { // Resource Created
              // variant: use Location header ?
              _this.manager.notifyComplete(_this, _this.xhr.responseText);
            } else {
              _this.manager.notifyError(_this, _this.xhr.status, _this.xhr.responseText);
            }
          }
      }
      try {
        this.xhr.open("POST", this.url || this.defaultUrl, true); // asynchronous
        formData = new FormData();
        var options = this.client.getPayload();
        for (k in options) {
          formData.append(k, options[k]);
        }
        this.xhr.send(formData);
      } catch (e) {
        this.manager.notifyError(this, e.name, e.message); // e.toString()
      }
    },
    
    // DEPRECATED : binary transfer
    // startXHR : function () {    
    //   this.xhr = new XMLHttpRequest();  // creates one request for each transmission (not sure XHRT is reusable)
    //   var _this = this;  
    //   this.xhr.onreadystatechange = function () {
    //     try {
    //       if (4 == _this.xhr.readyState) {
    //         if (_this.xhr.status  == 201) { // Resource Created
    //           _this.manager.notifyComplete(_this, _this.xhr.responseText);
    //         } else {
    //           _this.manager.notifyError(_this, _this.xhr.status, _this.xhr.statusText);             
    //         }
    //         _this.xhr = null; // GC ?
    //       } 
    //     } catch (e) {
    //       _this.manager.notifyError(_this, e.name, e.message); // e.toString()
    //     }
    //   } 
    //   this.xhr.open("POST", this.url || this.defaultUrl); // FIXME: store URL in base parameter of editor 
    //   this.xhr.overrideMimeType('text/plain; charset=x-user-defined-binary');  
    //   // Document id should have been set through a 'documentId' filter 
    //   // Document id is sent then "$$$" then photo data 
    //   // If I knew how to send a multipart message with XMLHTTPRequest that would be cleaner !
    //   var id = this.client.getDocumentId() || 'noid';
    //   this.xhr.sendAsBinary(id + "$$$" + this.client.getPayload().getAsBinary());
    //   // FIXME: encode parameters in URL ?
    // },
    
    cancel : function () {
      if (this.xhr) {
        this.isCancelled = true; // because onreadystatechange may be fired on some browsers !
        this.xhr.abort();
      } else {
        // FIXME: how to cancel a form submission ? 
        // window.stop stops everything including animated gif...     
        var form = this.client.getPayload();
        form.reset(); // naive trial to cancel transmission
      }
    } 
  } 

  xtiger.registry.registerFactory('upload', 
    {
      // UploadManager creation (one per document)
      getInstance : function (doc) {
        var cache = xtiger.session(doc).load('upload');
        if (! cache) {
          cache = new UploadManager(doc);
          xtiger.session(doc).save('upload', cache);
        }   
        return cache;
      }
    }
  );
}());
// file: axel/src/devices/trackermenu.js
/* ***** BEGIN LICENSE BLOCK *****
 *
 * @COPYRIGHT@
 *
 * This file is part of the Adaptable XML Editing Library (AXEL), version @VERSION@ 
 *
 * @LICENSE@
 *
 * Web site : http://media.epfl.ch/Templates/
 * 
 * Author(s) : Stephane Sire
 * 
 * ***** END LICENSE BLOCK ***** */              

/*****************************************************************************\
|                                                                             |
|  Menu device that appears on above a DOM node (img, div, etc.)              |
|    the menu is populated with commands / callbacks presented as <button>    |
|    one shared menu instance per-document should be sufficient in most cases |
|    style with div.axel-tracker-menu                                         |
|    depends on jQuery                                                        |
|                                                                             |
\*****************************************************************************/
(function(){    
  
  function trackerMenu (aDocument, aSpec) {
    var self = this, 
        i, key, label, cur, wrapper;

    function execCommandCb (ev) {
      if (self.targetModel !== undefined) {
        self.commands[ev.data][0].call(self.targetModel);
      }   
    }
  
    function moveCb (ev) {        
      var wrapped, pos, right, bottom;
      if (self.targetNode) {
        wrapped = $(self.targetNode);
        pos = wrapped.offset(); 
        if (pos) {
          right = pos.left +  wrapped.width();
          bottom = pos.top +  wrapped.height();
          if ((ev.pageX > right) || (ev.pageX < pos.left)
            || (ev.pageY < pos.top) || (ev.pageY > bottom))
          {
            self.stopEditing();
          }
        } else {
          xtiger.cross.log('debug', '[Tracker menu] moveCb cannot find position for element');
        }
      } else {
        xtiger.cross.log('debug', '[Tracker menu] calling move with no target');
      }
    }       
    
    this.targetModel = undefined; // the current editor beeing tracked
    this.targetNode = undefined; // the current DOM node beeing overlaid
    
    // menu view construction
    this.commands = {}; // { command name : [callback, button] } associations
    this.menuDiv = xtdom.createElement(aDocument, 'div');
    xtdom.addClassName(this.menuDiv, 'axel-tracker-menu');
    wrapper = $(this.menuDiv);
    for (i = 0; i < aSpec.length; i++) {
      // FIXME: create row for buttons
      for (key in aSpec[i]) { 
        label = aSpec[i][key][0];
        cur = xtdom.createElement(aDocument, 'button');
        this.menuDiv.appendChild(cur);
        $(cur).text(label).bind('click', key, execCommandCb);
        this.commands[key] = [aSpec[i][key][1], cur, true]; // do not memorizes label  
        // ['command name' ,<button> , enable/disable (true or false)]
      }     
    }           
    wrapper.appendTo($('body', aDocument));
    this.menuWidth = wrapper.width();
    this.menuHeight = wrapper.height();
    wrapper.hide();
    
    this.startEditing = function (aModel, aDomNode, aState) {     
      var key;
      var wrapped = $(aDomNode);
      var pos = wrapped.offset();      
      this.targetModel = aModel;  
      this.targetNode = aDomNode;
      $('body', aModel.getDocument()).bind('mousemove', moveCb);
      // centers and show this.menuDiv above aDomNode
      $(this.menuDiv).css({ 
        'top' : pos.top + (wrapped.height() / 2) - (this.menuHeight / 2), 
        'left' : pos.left + (wrapped.width() / 2) - (this.menuWidth / 2)
        }).show();
      // sets initial button state: aState MUST have one entry per-command/button !
      for (key in aState) {
       aState[key] ? this.enable(key) : this.disable(key);
      }
    };

    this.stopEditing = function () {
      if (this.targetModel) { // sanity check (e.g. if called as a consequence of tab key navigation)
        $('body', this.targetModel.getDocument()).unbind('mousemove', moveCb);
        this.targetModel = undefined;
        this.targetNode = undefined;
        $(this.menuDiv).hide();
      }                        
    };
  }
  
  trackerMenu.prototype = {  
    isTracking : function () {
      return (this.targetModel !== undefined);
    },
    // disable button corresponding to command name
    disable : function (command) { 
      if (this.commands[command][2]) {
        this.commands[command][1].disabled = true;
        $(this.commands[command][1]).addClass('off');
        this.commands[command][2] = false;
      }
    },
    // enable button corresponding to command name
    enable : function (command) {               
      if (this.commands[command][2] === false) {
        this.commands[command][1].disabled = false;  
        $(this.commands[command][1]).removeClass('off');
        this.commands[command][2] = true;
      }
    }
  };

  // expose as xtiger.editor.TrackerMenu
  xtiger.editor.TrackerMenu = trackerMenu;  
  
})();
// file: axel/src/plugins/select.js
/* ***** BEGIN LICENSE BLOCK *****
 *
 * @COPYRIGHT@
 *
 * This file is part of the Adaptable XML Editing Library (AXEL), version @VERSION@ 
 *
 * @LICENSE@
 *
 * Web site : http://media.epfl.ch/Templates/
 * 
 * Author(s) : Stephane Sire, Antoine Yersin
 * 
 * ***** END LICENSE BLOCK ***** */

(function ($axel) {

  // Plugin static view: span showing current selected option
  var _Generator = function ( aContainer, aXTUse, aDocument ) {
   var viewNode = xtdom.createElement (aDocument, 'span');
   var t = xtdom.createTextNode(aDocument, '');
   viewNode.appendChild(t);
   xtdom.addClassName (viewNode, 'axel-core-editable');
   aContainer.appendChild(viewNode);
   return viewNode;
  };

  var _Editor = (function () {
 
   function _getDevice ( doc ) {
     var devKey = 'popupdevice';
     var device = xtiger.session(doc).load(devKey);
     if (! device) {  // lazy creation
       device = new xtiger.editor.PopupDevice(doc); // hard-coded device for this model
       xtiger.session(doc).save(devKey, device);
     }
     return device;
   }

   // Splits string s on every space not preceeded with a backslash "\ "
   // Returns an array
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
 
   return {

     ////////////////////////
     // Life cycle methods //
     ////////////////////////

     onInit : function ( aDefaultData, anOptionAttr, aRepeater ) {
       this.defaultScreenData = aDefaultData; // directly in screen (localized) form
       this.device = _getDevice(this.getDocument());
       if (this.getParam('hasClass')) {
         xtdom.addClassName(this._handle, this.getParam('hasClass'));
       }   
       this._setData(this.i18nFilter(this.defaultScreenData, false), this.defaultScreenData);
     },

     // Awakes the editor to DOM's events, registering the callbacks for them
     onAwake : function () {
       var _this = this;       
       xtdom.addEventListener(this._handle, 'click', function (ev) { _this.startEditing(ev); }, true);
     },

     onLoad : function (aPoint, aDataSrc) {
       var value;
       if (aPoint !== -1) {
         value = aDataSrc.getDataFor(aPoint);
         if (value) {
           this._setData(value);
         }
         this.set(false);
       } else {
         this.clear(false);
       }
     },

     onSave : function (aLogger) {
       if ((!this.isOptional()) || this.isSet()) {
         aLogger.write(this._data);
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
         var tmp;
         this._param = {};
         xtiger.util.decodeParameters(aXTNode.getAttribute('param'), this._param);
         this._content = xtdom.extractDefaultContentXT(aXTNode);
         tmp = aXTNode.getAttribute('option');
         this._option = tmp ? tmp.toLowerCase() : null;
         // completes the parameter set
         var values = aXTNode.getAttribute('values');
         var i18n = aXTNode.getAttribute('i18n');        
         var _values = values ? _split(values) : 'null';
         var _i18n = i18n ? _split(i18n) : false;
         this._param.values = _i18n ? [_i18n,  _values] : _values;
       }
     },

     /////////////////////////////
     // Specific plugin methods //
     /////////////////////////////

     methods : {
     
       _setData : function (value, display) {
         var d = display || this.i18nFilter(value, true);
         if (this._handle.firstChild) {
           this._handle.firstChild.data = d;
         }
         this._data =  value;
       },
     
       // Returns model data (not the i18n version)
       getData : function() {  
         var val = (this.getParam('select_dispatch') === 'value') ? this._data : this.i18nFilter(this._data, true);
         return val;
       },
     
       startEditing : function(aEvent) {     
         var _options, options = this.getParam('values');
         if (options) {
           _options = ('string' !== typeof(options[0])) ? options[0] : options; // checks if values contains [i18n, values]
           this.device.startEditing(this, _options, this.i18nFilter(this._data, true), this.getHandle());
            // uses this._data as the mode is the i18n version of the label
         }
       },

       // NOT CALLED FOR THIS EDITOR
       stopEditing : function() {
       },

       // aData is the universal value and not the localized one
       update : function(aData) {                            
         var val = (this.getParam('select_dispatch') === 'value') ? aData : this.i18nFilter(aData, false);
         if (val === this._data) { // no change
           return;
         }
         this._setData(val);
         // updates isModified, this is meaningful iff default value is a "no choice"
         this.setModified(aData !== this.i18nFilter(this.defaultScreenData, false));
         this.set(true);
       },

       clear : function(doPropagate) { 
         this._setData(this.i18nFilter(this.defaultScreenData, false), this.defaultScreenData);
         if (this.isOptional()) {
           this.unset(doPropagate);
         }
       },
     
       // Handles popup menu selection
       onMenuSelection : function (value) {  
         if (this.getParam('select_dispatch') === 'value') {
           this.update(this.i18nFilter(value, false));
         } else {
           this.update(value);
         }
       },  

       // Converts i18n choices to non-i18n values
       // If xmlToLabel is true conversion occurs from XML value to displayed label
       // the other way around otherwise
       i18nFilter : function (value, xmlToLabel) {
         var i, selected = value,
             options = this.getParam('values');
         if (! options) {
           xtiger.cross.log('error', 'missing "values" attribute in "select" plugin declaration');
         } else if ('string' !== typeof(options[0])) { // values contains [i18n, values]
           var src = options[xmlToLabel ? 1 : 0];
           var target = options[xmlToLabel ? 0 : 1];
           for (i = 0; i < src.length; i++) { // translate i18n value to XML value
             if (value === src[i]) {
               if (i < target.length ) { // sanity check
                 selected = target[i];
               } else {
                 selected = "**Error**";
               }
               break;
             }
           }
         } 
         return selected;
       }
     }
   };
  }());

  $axel.plugin.register(
    'select', 
    { filterable: true, optional: true },
    { 
     select_dispatch : 'value'  // alternative is 'display'
    },
    _Generator,
    _Editor
  );
}($axel));

// file: axel/src/plugins/text.js
/* ***** BEGIN LICENSE BLOCK *****
 *
 * @COPYRIGHT@
 *
 * This file is part of the Adaptable XML Editing Library (AXEL), version @VERSION@ 
 *
 * @LICENSE@
 *
 * Web site : http://media.epfl.ch/Templates/
 * 
 * Author(s) : Stéphane Sire
 * 
 * ***** END LICENSE BLOCK ***** */

 (function ($axel) {

   var _Generator = function ( aContainer, aXTUse, aDocument ) {
     var htag = aXTUse.getAttribute('handle') || 'span',
         h = xtdom.createElement(aDocument, htag),
         t = xtdom.createTextNode(aDocument, '');
     h.appendChild(t);
     xtdom.addClassName(h, 'axel-core-on');
     aContainer.appendChild(h);
     return h;
   };

   var _Editor = {

     ////////////////////////
     // Life cycle methods //
     ////////////////////////

     onInit : function ( aDefaultData, anOptionAttr, aRepeater ) {
       var devfactory, 
           devname = this.getParam('device');
       if ((! aDefaultData) || (typeof aDefaultData !== 'string')) { 
         this._content = 'click to edit'; // FIXME: setDefaultData() ? finalize API...
       }
       this._data = this.getDefaultData(); // Quirck in case _setData is overloaded and checks getDefaultData()
       this._setData(this._data);
       if (this.getParam('hasClass')) {
         xtdom.addClassName(this._handle, this.getParam('hasClass'));
       }
       devfactory = devname ? xtiger.factory(devname) : xtiger.factory(this.getParam('defaultDevice'));
       this._device = devfactory.getInstance(this.getDocument(), this.getParam('type'), this.getParam('layout'));
        // HTML element to represents an editor containing no data 
       this._noData = this._handle.firstChild; // ?
     },

     // Awakes the editor to DOM's events, registering the callbacks for them
     onAwake : function () {
       var _this = this;
       if (!this.getParam('noedit')) {
         xtdom.addClassName(this._handle, 'axel-core-editable');
         xtdom.addEventListener(this._handle, 'click', 
           function(ev) { _this.startEditing(ev); }, true);
       }
     },

     onLoad : function (aPoint, aDataSrc) {
       var _value, _default;
       if (aPoint !== -1) { 
         _value = aDataSrc.getDataFor(aPoint);
         _default = this.getDefaultData();
         this._setData(_value || _default);
         this.setModified(_value && (_value !==  _default));
         this.set(false);
       } else {
         this.clear(false);
       }
     },

     onSave : function (aLogger) {
       if (this.isOptional() && (!this.isSet())) {
         aLogger.discardNodeIfEmpty();
         return;
       }
       if (this._data) {
         if (this.isModified() || (this.getParam('placeholder') !== 'clear')) {
           aLogger.write(this._data);
         }
       }
     },

     ////////////////////////////////
     // Overwritten plugin methods //
     ////////////////////////////////

     api : {

       isFocusable : function () {
         return !this.getParam('noedit');
       },

       // Request to take focus (from tab navigation manager)
       focus : function () {
         this.startEditing();
       },

       // Request to leave focus (fro tab navigation manager)
       unfocus : function () {
         this.stopEditing();
       },

       // Overwritten to support an inDOMOnly parameter
       getHandle : function (inDOMOnly) {
         if (inDOMOnly) {
           // test if *this* instance is being edited and has a "placed" layout
           if (this.getParam('layout') === 'placed' && this._device && this._device.getCurrentModel() === this)
             return this._device.getHandle();
         }
         return this._handle;
       }
     },

     /////////////////////////////
     // Specific plugin methods //
     /////////////////////////////

     methods : {

       // Sets current data model and updates DOM view accordingly
       _setData : function (aData) {
         if (this._handle.firstChild)
           this._handle.firstChild.data = aData;
         this._data = aData;
       },

       // Returns current data model
       getData : function () {
         return this._data;
       },

       // Returns the DOM node which can be used to set the device's handle size
       getGhost : function () {
         var s = this.getParam('shape'); // checks first char is p like 'parent'
         return (s && s.charAt(0) === 'p') ? this._handle.parentNode : this._handle;
       },

       // Starts editing the field's model. Selects all text if the field's content is
       // still the default value or if triggered from a user event with SHIFT key pressed
       startEditing : function (aEvent) {
         var _doSelect = !this.isModified() || (aEvent && aEvent.shiftKey);
         this._device.startEditing(this, aEvent, _doSelect);
       },

       // Stops the edition process on the device
       stopEditing : function () {
         this._device.stopEditing(false, false);
       },

       // Updates data model
       update : function (aData) { 
         var tmp, isadef;
         if (aData === this._data) { // no change
           return;
         }
         // normalizes text (empty text is set to _defaultData)
         tmp = aData.replace(/^\s\s*/, '').replace(/\s\s*$/, '');
         isadef = tmp === this.getDefaultData();
         if ((tmp.length === 0) || (isadef && (this.getParam('placeholder') !== 'preserve'))) {
           this.clear(true);
           return;
         }
         this._setData(tmp);
         this.setModified(!isadef);
         this.set(true);
       },

       // Clears the model and sets its data to the default data.
       // Unsets it if it is optional and propagates the new state if asked to.     
       clear : function (doPropagate) {
         this._setData(this.getDefaultData());
         this.setModified(false);
         if (this.isOptional() && this.isSet())
           this.unset(doPropagate);
       }
     }
   };

   $axel.plugin.register(
     'text', 
     { filterable: true, optional: true },
     { 
       placeholder : 'preserve',
       device : 'text-device',
       type : 'input',
       layout : 'placed',
       shape : 'self',
       expansion : 'grow',
       clickthrough : 'true', // FIXME: use a real boolean ?
       enablelinebreak : 'false'
     },
     _Generator,
     _Editor
   );
 }($axel));
// file: axel/src/plugins/content.js
/* ***** BEGIN LICENSE BLOCK *****
 *
 * @COPYRIGHT@
 *
 * This file is part of the Adaptable XML Editing Library (AXEL), version @VERSION@ 
 *
 * @LICENSE@
 *
 * Web site : http://media.epfl.ch/Templates/
 * 
 * Author(s) : Stéphane Sire
 * 
 * ***** END LICENSE BLOCK ***** */

(function ($axel) {

  var _Generator = function ( aContainer, aXTUse, aDocument ) {
    var htag = aXTUse.getAttribute('handle') || 'span',
        h = xtdom.createElement(aDocument, htag),
        t = xtdom.createTextNode(aDocument, '');
    h.appendChild(t);
    xtdom.addClassName(h, 'axel-core-on');
    aContainer.appendChild(h);
    return h;
  };

  // Uses a closure to store class level private utility properties and functions
  var _Editor = (function () {

    var _timestamp = -1;

    function _focusAndSelect ( editor ) {
      // pre-condition: the editor's handle must already have focus
      try {
        editor.getDocument().execCommand('selectAll', false, ''); // FIXME: fails on iPad
      }
      catch (e) { }
    }

    function _trim ( str ) {
      var tmp = str.replace(/\s+/gi,' ');
      if (/\s/.test(tmp.charAt(0))) {
        tmp = tmp.substr(1);
      }
      if (/\s$/.test(tmp)) {
        tmp = tmp.substr(0, tmp.length-1);
      }
      return tmp;
    }

    // Checks node contains only a text node, otherwise recreate it
    // (this can be used to prevent cut and paste side effects)
    function _sanitize ( node, doc ) {
      var tmp = '';
      if ((node.children.length > 1) || (node.firstChild && (node.firstChild.nodeType !== xtdom.TEXT_NODE))) {
        // Detect whether the browser supports textContent or innerText
        if (typeof node.textContent === 'string') {
          tmp = node.textContent;
        } else if (typeof node.innerText === 'string') {
          tmp = node.innerText;
        }
        node.innerHTML = '';
        t = xtdom.createTextNode(doc, tmp ? _trim(tmp) : tmp);
        node.appendChild(t);
      }
    }
    
    return {

      ////////////////////////
      // Life cycle methods //
      ////////////////////////

      onInit : function ( aDefaultData, anOptionAttr, aRepeater ) {
        if ((! aDefaultData) || (typeof aDefaultData !== 'string')) { 
          this._content = 'click to edit'; // FIXME: setDefaultData() ? finalize API...
        }
        this.model = aDefaultData; // Quirck in case _setData is overloaded and checks getDefaultData()
        this._setData(this.model);
        if (this.getParam('hasClass')) {
          xtdom.addClassName(this._handle, this.getParam('hasClass'));
        }
        this.keyboard = xtiger.session(this.getDocument()).load('keyboard');
        this.editInProgress = false;
      },

      // Awakes the editor to DOM's events, registering the callbacks for them
      onAwake : function () {
        var _this = this;
        if (this.getParam('noedit') !== 'true') {
          xtdom.setAttribute(this._handle, 'contenteditable', 'true');
          xtdom.addClassName(this._handle, 'axel-core-editable');
          // 'mousedown' always preceeds 'focus', saves shiftKey timestamp to detect it in forthcoming 'focus' event
          xtdom.addEventListener(this._handle, 'mousedown', function(ev) { if (ev.shiftKey) { _timestamp = new Date().getTime(); } }, true);
          // tracks 'focus' event in case focus is gained with tab navigation  (no shiftKey)
          xtdom.addEventListener(this._handle, 'focus', function(ev) {  _this.startEditing(); }, true);
          if (xtiger.cross.UA.gecko) {  // gecko: prevent browser from selecting contentEditable parent in triple clicks ! 
            xtdom.addEventListener(this._handle, 'mousedown', function(ev) { if (ev.detail >= 3) { xtdom.preventDefault(ev);xtdom.stopPropagation(ev);_this._handle.focus();_focusAndSelect(_this); } }, true);
          }
          if (xtiger.cross.UA.webKit) {
            this.doSelectAllCb = function () { _focusAndSelect(_this); }; // cache function
          }
          // TODO: instant paste cleanup by tracking 'DOMNodeInserted' and merging each node inserted ?
        }
        this.blurHandler = function (ev) { _this.handleBlur(ev); };
      },

      onLoad : function (aPoint, aDataSrc) {
        var _value, _default;
        if (aPoint !== -1) { 
          _value = aDataSrc.getDataFor(aPoint);
          _default = this.getDefaultData();
          this._setData(_value || _default);
          this.setModified(_value !==  _default);
          this.set(false);
        } else {
          this.clear(false);
        }
      },

      onSave : function (aLogger) {
        if (this.isOptional() && (!this.isSet())) {
          aLogger.discardNodeIfEmpty();
          return;
        }
        if (this.model) {
          aLogger.write(this.model);
        }
      },

      ////////////////////////////////
      // Overwritten plugin methods //
      ////////////////////////////////

      api : {
      
        isFocusable : function () {
          return this.getParam('noedit') !== 'true';
        },

        focus : function () {
          this._handle.focus(); // should trigger focus event
        },

        unfocus : function () {
          this.stopEditing(false);
        }
      },

      /////////////////////////////
      // Specific plugin methods //
      /////////////////////////////

      methods : {

        // Sets editor model value. Takes the handle and updates its DOM content.
        _setData : function (aData) {
          var t;
          if (this._handle.firstChild) {
            this._handle.firstChild.data = aData;
          } else { // in case user has deleted all the field
            t = xtdom.createTextNode(this.getDocument(), aData);
            this._handle.appendChild(t);
          }
          this.model = aData;
        },

        // AXEL keyboard API (called from Keyboard manager instance)
        isEditing : function () {
          return this.editInProgress !== false;
        },

         // AXEL keyboard API (called from Keyboard manager instance)
        cancelEditing : function () {
          this.stopEditing(true);
        },

         // AXEL keyboard API (called from Keyboard manager instance)
        doKeyDown : function (ev) { 
        },

         // AXEL keyboard API (called from Keyboard manager instance)
        doKeyUp : function (ev) { 
        },

        // Starts editing the field (to be called once detected)
        startEditing : function () {
          // avoid reentrant calls (e.g. user's click in the field while editing)
          if (this.editInProgress === false) {
            this.editInProgress = true;
            // registers to keyboard events
            this.kbdHandlers = this.keyboard.register(this);
            this.keyboard.grab(this, this);
    //        xtdom.removeClassName(this._handle, 'axel-core-editable');
            if ((!this.isModified()) || ((_timestamp !== -1) && ((_timestamp - new Date().getTime()) < 100))) {
              if (xtiger.cross.UA.webKit) {
                // it seems on webkit the contenteditable will really be focused after callbacks return
                setTimeout(this.doSelectAllCb, 100);
              } else {
                _focusAndSelect(this); 
              }
            }
            // must be called at the end as on FF 'blur' is triggered when grabbing
            xtdom.addEventListener(this._handle, 'blur', this.blurHandler, false);
          }
        },

        // Stops the edition process on the device
        stopEditing : function (isCancel) {
          if ((! this.stopInProgress) && (this.editInProgress !== false)) {
            this.stopInProgress = true;
            _timestamp = -1;
            this.keyboard.unregister(this, this.kbdHandlers);
            this.keyboard.release(this, this);
            xtdom.removeEventListener(this._handle, 'blur', this.blurHandler, false);
            _sanitize(this._handle, this.doc);
            if (!isCancel) {
              // user may have deleted all
              // FIXME: we should also normalize in case of a paste that created garbage (like some <br/>)
              this.update(this._handle.firstChild ? this._handle.firstChild.data : null);
            } else {
              // restores previous data model - do not call _setData because its like if there was no input validated
              if (this._handle.firstChild) {
                this._handle.firstChild.data = this.model;
              }
            }
            this._handle.blur();
    //        xtdom.addClassName(this._handle, 'axel-core-editable');
            this.stopInProgress = false;
            this.editInProgress = false;
          }
        },

        // Updates the editor data model with the given data
        // This gives a chance to normalize the input
        update : function (aData) { 
          if (aData === this.model) { // no change
            return;
          }
          // normalizes text (empty text is set to _defaultData)
          if ((!aData) || (aData.search(/\S/) === -1) || (aData === this.getDefaultData())) {
            this.clear(true);
            return;
          }
          this._setData(aData);
          this.setModified(true);
          this.set(true);
        },

        // Clears the model and sets its data to the default data.
        // Unsets it if it is optional and propagates the new state if asked to.     
        clear : function (doPropagate) {
          this._setData(this.getDefaultData());
          this.setModified(false);
          if (this.isOptional() && this.isSet()) {
            this.unset(doPropagate);
          }
        },

        handleBlur : function (ev) {
          this.stopEditing(false);
        }
      }
    };
  }());

  $axel.plugin.register(
    'content', 
    { filterable: false, optional: true },
    { 
      noedit : 'false'
    },
    _Generator,
    _Editor
  );
}($axel));

// file: axel/src/plugins/photo.js
/* ***** BEGIN LICENSE BLOCK *****
 *
 * @COPYRIGHT@
 *
 * This file is part of the Adaptable XML Editing Library (AXEL), version @VERSION@ 
 *
 * @LICENSE@
 *
 * Web site : http://media.epfl.ch/Templates/
 * 
 * Author(s) : Stephane Sire
 * 
 * ***** END LICENSE BLOCK ***** */
 
(function ($axel) {

 var _Generator = function ( aContainer, aXTUse, aDocument ) {
   var viewNode = xtdom.createElement (aDocument, 'img');
   xtdom.setAttribute (viewNode, 'src', xtiger.bundles.photo.photoIconURL);
   xtdom.addClassName (viewNode , 'axel-drop-target');
   xtdom.addClassName (viewNode , 'axel-photo-model');
   aContainer.appendChild(viewNode);
   return viewNode;   
 };

 // you may add a closure to define private properties / methods
 var _Editor = {

   ////////////////////////
   // Life cycle methods //
   ////////////////////////
   onInit : function ( aDefaultData, anOptionAttr, aRepeater ) {
     var base = this.getParam('photo_base');
     if (base && (base.charAt(base.length - 1) !== '/')) { // sanitize base URL
       base = base + "/";
       this._param.photo_base = base;
       // this.configure('photo_base', base);
     } 
     this.state = new xtiger.editor.PhotoState(this);
     if (base) {
       this.state.base = base;
     }
   },

   // Awakes the editor to DOM's events, registering the callbacks for them
   onAwake : function () {
     this.device = xtiger.factory('lens').getInstance(this.getDocument());
     var _this = this;
     xtdom.addEventListener (this._handle, "error", function (ev) { _this.state.onError('Broken Image', true); }, false);
     xtdom.addEventListener (this._handle, this.getParam('trigger'), 
        function (ev) {
          _this.device.startEditing(_this, 'photo');
          xtdom.preventDefault(ev); xtdom.stopPropagation(ev); 
        }, false);
     // HTML 5 DnD - FIXME: to be implemented as a filter
     // if (xtiger.cross.UA.gecko) { // FIXME: check version too !
     //  xtdom.addEventListener (this._handle, "dragenter", function (ev) { _this.onDragEnter(ev) }, false);  
     //  xtdom.addEventListener (this._handle, "dragleave", function (ev) { _this.onDragLeave(ev) }, false);  
     //  xtdom.addEventListener (this._handle, "dragover", function (ev) { _this.onDragOver(ev) }, false);  
     //  xtdom.addEventListener (this._handle, "drop", function (ev) { _this.onDrop(ev) }, false);
     // }
     this._constructStateFromUrl(this.getDefaultData());
     this.redraw (false);
   },

   onLoad : function (aPoint, aDataSrc) {
     var p, value = (aPoint !== -1) ? aDataSrc.getDataFor(aPoint) : this.getDefaultData();
     this._constructStateFromUrl (value);
     if (aDataSrc.hasAttributeFor('resource_id', aPoint)) { // optional 'resource_id'
       p = aDataSrc.getAttributeFor('resource_id', aPoint);
       this.state.resourceId = aDataSrc.getDataFor(p);
     }
     this.redraw(false);
   },

   onSave : function (aLogger) {
     aLogger.write(this._dump()); 
     if (this.state.resourceId) { // savec optional 'resource_id' attribute
       aLogger.writeAttribute("resource_id", this.state.resourceId);
     }   
   },

   ////////////////////////////////
   // Overwritten plugin methods //
   ////////////////////////////////
   api : {
     // no variations
   },

   /////////////////////////////
   // Specific plugin methods //
   /////////////////////////////
   methods : {
     
     // Returns the actual data model, lens wrapper may ask this to build their view
     getData : function () {
       return this.state;
     },

     // HTML 5 API for DnD and FileReader (FF >= 3.6)
     getFile : function () {
       return this.file;
     },
     
     _constructStateFromUrl : function (value) {
       this.state.resourceId = null;
       if (value && (value.search(/\S/) !== -1)) { // there is a photo URL
         this.state.status = xtiger.editor.PhotoState.prototype.COMPLETE;
         this.state.photoUrl = value;
       } else {
         this.state.status = xtiger.editor.PhotoState.prototype.READY;
         this.state.photoUrl = null;
       }
     },

     _dump : function () {
       return (this.state.photoUrl) ? this.state.photoUrl : '';
     },  

     // Updates display state to the current state, leaves state unchanged 
     // FIXME: rename to _setData
     redraw : function (doPropagate) {
       var cname, src, base, force = false;
       switch (this.state.status) {
         case xtiger.editor.PhotoState.prototype.READY: 
           src = xtiger.bundles.photo.photoIconURL;
           break;
         case xtiger.editor.PhotoState.prototype.ERROR: 
           src = xtiger.bundles.photo.photoBrokenIconURL;
           break;
         case xtiger.editor.PhotoState.prototype.UPLOADING: 
           src = xtiger.bundles.photo.spiningWheelIconURL;
           break;
         case xtiger.editor.PhotoState.prototype.COMPLETE:
           if (doPropagate) {        
             var cur = this._handle.getAttribute('src');
             if (cur !== this.state.photoUrl) { // Photo URL has changed and successfully uploaded
               xtiger.editor.Repeat.autoSelectRepeatIter(this._handle);
             }
           }
           force = true; // photo upload service may keep same URL for new photo (?)
           src = this.state.genPhotoUrl();
           break;
         default: src = xtiger.bundles.photo.photoBrokenIconURL;
       }
       if ((this._handle.getAttribute('src') !== src) || force) {
         xtdom.setAttribute (this._handle, 'src', base ? base + src : src);
         if (xtiger.cross.UA.IE) {
           this._handle.removeAttribute('width');
           this._handle.removeAttribute('height');
         }
         cname = this.getParam('photo_class'); // Issue #16
         if (cname) {
           if (xtiger.editor.PhotoState.prototype.COMPLETE === this.state.status) {
             xtdom.addClassName(this._handle, cname);
           } else {
             xtdom.removeClassName(this._handle, cname);
           }
         }
       }
     },

     // Just redraws as the state is shared with the lens it is already synchronized
     // Does nothing because side effects will happens when wrapper will be released just after
     update : function (data) {
       // tests if update is called outside of the lens wrapper (i.e. a service)
       // in which case expected data is not a PhotoState object but a simple hash
       if (data.isPhotoStateObject === undefined) { 
         if (data.photoUrl) { // assumes a { photoUrl: , resource_id: } hash
           this._constructStateFromUrl(data.photoUrl);
           if (data.resource_id) {
             this.state.resourceId = data.resource_id;  
           }
          } else { // assumes a string with a simple photoUrl
           this._constructStateFromUrl(data);        
         }
         // FIXME: in case the lens was visible at that time, it should cancel 
         // any ongoing upload first
         this.redraw(true);      
       }
       // otherwise redraw will be called from consecutive PhotoWrapper release call
     }
     
     // onDragEnter : function (ev) {  
     //   xtdom.addClassName (this._handle, 'axel-dnd-over');
     //   xtdom.stopPropagation(ev);
     //   xtdom.preventDefault(ev);
     // },
     // 
     // onDragOver : function (ev) {       
     //   xtdom.stopPropagation(ev);
     //   xtdom.preventDefault(ev);
     // },
     // 
     // onDragLeave : function (ev) {  
     //   xtdom.removeClassName (this._handle, 'axel-dnd-over');
     //   xtdom.stopPropagation(ev);
     //   xtdom.preventDefault(ev);
     // },  
     // 
     // onDrop : function (ev) {       
     //   var dt = ev.dataTransfer;  
     //   var files = dt.files; 
     //   xtdom.stopPropagation(ev);
     //   xtdom.preventDefault(ev);
     // 
     //   // find the first image file
     //   for (var i = 0; i < files.length; i++) {  
     //     var file = files[i];  
     //     var imageType = /image.*/;  
     //     if (!file.type.match(imageType)) {  
     //       continue;  
     //     }  
     //     this.state.startTransmission(this.getDocument(), 'dnd', file, this.getParam('photo_URL'));
     //   } 
     // } 
   }
 };

 $axel.plugin.register(
   'photo', 
   { filterable: true, optional: true },
   { 
     trigger : 'click' // 'click' or 'mouseover' DOM events (see awake)      
   },
   _Generator,
   _Editor
 );
 
 xtiger.resources.addBundle('photo', 
   { 'photoIconURL' : 'icons/photo.png',
     'photoBrokenIconURL' : 'icons/photobroken.png',
     'spiningWheelIconURL' : 'icons/spiningwheel.gif',
     'lensBoxURL' : 'photo.xhtml' } );
     
  //////////////////
  // Utility class  
  //////////////////
  xtiger.editor.PhotoState = function (client) {
   this.status = this.READY;
   this.photoUrl = null; // photo URL
   this.resourceId = null; // optional id as returned by server
   this.errMsg = null; // eventual error message 
   this.transmission = null;
   this.delegate = client; 
  };

  xtiger.editor.PhotoState.prototype = {

   // State encoding
   READY : 0, // no photo uploaded, ready to upload
   ERROR : 1, // last upload was an error
   UPLOADING : 2, // uploading in progress
   COMPLETE : 3, // photo stored on server and visible

   isPhotoStateObject : true,

   genPhotoUrl : function () {
     return (this.base ? this.base + this.photoUrl : this.photoUrl);
   },

   setDelegate : function (client) {
     this.delegate = client;
   },

   getPayload : function () {
     return this.payload;
   },

   // Called after a transmission has started to retrieve the document id
   getDocumentId : function () {
     return xtiger.session(this.myDoc).load('documentId');
   },

   startTransmission : function (doc, kind, payload, url) {
     this.cached = [this.status, this.photoUrl, this.resourceId, this.errMsg]; // in case of cancellation
     var manager = xtiger.factory('upload').getInstance(doc);
     this.myDoc = doc;
     this.transmission = manager.getUploader();
     this.transmission.setDataType(kind);
     if (url) {
       this.transmission.setAction(url);   
     }
     this.payload = payload;
     this.status = this.UPLOADING;
     manager.startTransmission(this.transmission, this);
     this.delegate.redraw ();
   },  

   cancelTransmission : function () {
     if (this.transmission) {
       var manager = xtiger.factory('upload').getInstance(this.myDoc);
       manager.cancelTransmission(this.transmission);
     }
   },

   onComplete : function (response) {
     this.status = this.COMPLETE;
     if (typeof(response) === "string") {
       this.photoUrl =  response;
       this.resourceId = null;
     } else {
       this.photoUrl =  response.url;
       this.resourceId = response.resource_id;
     }
     this.errMsg = null;
     this.transmission = null;
     this.delegate.redraw ();
   },

   onError : function (error, dontResetPhotoUrl) {
     this.status = this.ERROR;
     if (! dontResetPhotoUrl) { this.photoUrl = null; }        
     this.errMsg = error;
     this.transmission = null;
     this.delegate.redraw ();
   },

   onCancel : function () {
     this.status = this.cached[0];
     this.photoUrl = this.cached[1]; 
     this.resourceId = this.cached[2]; 
     this.errMsg = this.cached[3];
     this.transmission = null;
     this.delegate.redraw ();
   }
  };

  // Helper class to control the dialog box for the lens device photo wrapper 
  // Downloads and installs the dialog box with an Ajax call
  //  This allows to change the dialog box look and feel independently of the library
  xtiger.editor.PhotoViewer = function (url, doc, target, wrapper) {
    var tname, iframe, _this = this;
    // creates photo lens container from external resource file at URL
    var lensDiv = this.view = xtdom.createElement(doc, 'div');
    xtdom.setAttribute(lensDiv, 'id', 'xt-photo');
    xtdom.addClassName(lensDiv, 'axel-lens-container');
    xtdom.addClassName(lensDiv, 'axel-lens-containerstyle');
    target.appendChild(this.view);
    try {                   
      // We could have used xtiger.cross.loadDocument 
      // But for IE you need to serve .xhtml resources with text/xml MIME-Type
      // So that it gets really parsed into responseXML and then the Document DOM 
      // objet (IXMLDOMDocument) does not implement getElementById
      // Hence we use the more classical responseText / innerHTML approach !
      var xhr = xtiger.cross.getXHRObject ();
      xhr.open("GET", url, false); // false:synchronous
      xhr.send(null);
      if ((xhr.status === 200) || (xhr.status === 0)) { // 0 is for loading from local file system
        if (xhr.responseText) { 
          lensDiv.innerHTML = xhr.responseText;       
        } else {
          throw {name : 'Error', message : 'Photo plugin initialization failed : empty lens bundle content'};
        }
      } else { 
        throw {name : 'Error', message : 'Photo plugin initialization failed : HTTP error (' + xhr.status + ')'};
      }
      this.formular   = doc.getElementById('xt-photo-form');
      this.icon     = doc.getElementById('xt-photo-icon');
      this.infobox  = doc.getElementById('xt-photo-info');
      this.errorbox   = doc.getElementById('xt-photo-error');
      this.filemenu   = doc.getElementById('xt-photo-form-body');
      this.btnselfile = doc.getElementById('xt-photo-file');
      this.btnupload  = doc.getElementById('xt-photo-save');    
      this.btncancel  = doc.getElementById('xt-photo-cancel');    
      // creates target iframe to collect server's response (Issue #19)
      tname = this.formular.getAttribute('target') || 'xt-photo-target';
      iframe = xtdom.createElement(doc, 'iframe');
      xtdom.setAttribute(iframe, 'id', tname);
      xtdom.setAttribute(iframe, 'name', tname);
      xtdom.setAttribute(iframe, 'src', 'javascript:false;');
      iframe.style.display = 'none';
      target.appendChild(iframe);
      xtdom.addEventListener(this.btnselfile, 'click', function () { _this.startSelectCb(); }, false);
      xtdom.addEventListener(this.btnupload , 'click', function () { _this.saveCb(); }, false);
      xtdom.addEventListener(this.btncancel , 'click', function () { _this.cancelCb(); }, false);
      this.btncancel.style.display = 'none';
      this.failed = false;
      this.hide();
    } catch (e) {
      this.view.innerHTML = "<p>File Upload is not available...<br/><br/>Failed to make lens with '" + url 
        + "'.<br/><br/>"+ e.name + ' : ' + e.message 
        + "</p>";                   
      this.failed = true;
    }   
    this.ready();   
    this.wrapper = wrapper;
  };

  xtiger.editor.PhotoViewer.prototype = {

    // Internal methods to control appearance
    showPhoto : function (src) {
      if (! this.failed) { 
        if (this.btnselfile.value.length > 0) { // reset the form when changing state
          this.formular.reset();
        }
        this.icon.setAttribute('src', src);
        this.icon.style.visibility = 'visible';     
        if (src === xtiger.bundles.photo.spiningWheelIconURL) {
          this.btncancel.style.display = 'block';
        } else {
          this.btncancel.style.display = 'none';
        }
      }
    },
    hideError : function () {
      if (!this.failed) { 
        this.errorbox.style.display = 'none';
      }
    },
    hideMessage : function () {
      if (!this.failed) { 
        this.infobox.style.display = 'none';      
      }
    },    
    showError : function (msg) {
      if (!this.failed) {
        this.errorbox.style.display = 'block';      
        this.errorbox.firstChild.data = msg;
      }
    },
    showUplButtons : function () {
      if (!this.failed) { 
        this.filemenu.style.display = '';
      }
    },    
    hideUplButtons : function () {
      if (!this.failed) {
        this.filemenu.style.display = 'none';
      }
    },

    // Public methods
    hide : function () {
      this.view.style.display = 'none';
    },
    
    show : function () {
      this.view.style.display = '';
    },
    
    showMessage : function (msg) {
      if (!this.failed) { 
        this.infobox.style.display = 'block';   
        this.infobox.firstChild.data = msg;
      }
    },
    
    getTopDiv : function () {
      return this.view;
    },  

    // State methods
    ready : function () {
      this.showPhoto(xtiger.bundles.photo.photoIconURL);
      this.showMessage("You can select a file and upload it");
      this.hideError();
      this.showUplButtons();
    },
    
    complete : function (photoUrl) {
      this.showPhoto(photoUrl);
      this.hideMessage();
      this.hideError();
      this.showUplButtons();      
    },
    
    loading : function () {
      this.showPhoto(xtiger.bundles.photo.spiningWheelIconURL);
      this.showMessage("Wait while loading");
      this.hideError();
      this.hideUplButtons();    
    },
    
    error : function (msg) {
      this.showPhoto(xtiger.bundles.photo.photoBrokenIconURL);
      this.showError(msg);
      this.hideMessage();
      this.showUplButtons();
    },
    
    busy : function () {
      this.btncancel.style.display = 'none'; // hidden in showPhoto in the other cases
      this.icon.style.visibility = 'hidden';      
      this.hideError();
      this.showMessage('Another upload is in progress, please wait until it finishes.');
      this.hideUplButtons();
    },
    
    activateUpload : function () {
      this.btnupload.removeAttribute('disabled');
    },
    
    deactivateUpload : function () {
      xtdom.setAttribute(this.btnupload, 'disabled', 'true');
    },

    // Controller functions
    startSelectCb : function () {
      this.wrapper.onStartSelect();
    },
    
    saveCb : function () {
      // FIXME: check filename is an image file
      if (this.btnselfile.value.length > 0) {
        this.wrapper.onStartUpload(this.formular); // gives form as parameter for calling submit()
      }
    },
    
    cancelCb : function () {
      this.wrapper.onCancelUpload();
    } 
  };

  // Lens Wrapper for photo upload device
  // If a photo has already been uploaded shows it in full size
  // Also shows a browser / submit dialog to upload / replace the photo
  xtiger.editor.PhotoWrapper = function (aDoc) {  
    this.myDoc = aDoc;
    var form = xtiger.session(aDoc).load('form');
    var root = (form && form.getRoot()) || aDoc.getElementsByTagName('body')[0]; // NOTE that body is undefined in XML document (.xtd)
    this.view = new xtiger.editor.PhotoViewer(xtiger.bundles.photo.lensBoxURL, aDoc, root, this); // temporary
    this.state = null;
  };

  xtiger.editor.PhotoWrapper.prototype = {

      // This wrapper does not manage keyboard entry, hence it is not focusable
      isFocusable: function () {
        return false; 
      },

      // Returns the top <div> lens container
      getHandle: function () {
        return this.view.getTopDiv();
      },

      // Returns the data currently hold by the wrapper.
      getData: function () {
        return this.state;      
      },

      // Grabs the wrapper with the given device usually on device behalf
      // Entry point to display the lens wrapper on screen
      grab: function (aDevice, aDoSelect, aPadding) {
        this.device = aDevice;      
        this.editor = aDevice.getCurrentModel();
        this.state = this.editor.getData();
        this.state.setDelegate(this);
        this.redraw();
        this.view.show();                                
        if (aPadding[0] > 0) { // FIXME: only one padding dimension
          this.view.getTopDiv().style.padding = aPadding[0] + 'px';
        }
      },         

      // Terminates the wrapper installation after the lens has been made visible
      activate: function(aDevice, doSelectAll) {
        // nope
      },    

      // Releases the wrapper, restores the handle usually on device behalf
      // Entry point to hide the lens wrapper
      release: function () {
        this.view.hide();     
        this.device = null;
        this.state.setDelegate(this.editor); // restore delegate
        // FIXME: shall we call it here since it seems more appropriate in editor.update
        // which has just been called before from the lens device !
        this.editor.redraw(true);
      },

      // Trick to avoid hiding the lens while interacting with modal file selection dialog
      onStartSelect : function () {
        this.device.mouseMayLeave();
      },

      // Starts uploading on behalf of the view
      onStartUpload : function (form) {
        this.state.startTransmission(this.myDoc, 'form', form, this.editor.getParam('photo_URL'));
      },

      onCancelUpload : function (form) {
        this.state.cancelTransmission();
      },

      // Displays current state
      redraw: function () {
        var mgr = xtiger.factory('upload').getInstance(this.myDoc);
        if (mgr.isReady() || mgr.isTransmitting(this.state.transmission)) {
          switch (this.state.status) {
            case xtiger.editor.PhotoState.prototype.READY: 
              this.view.ready(); break;
            case xtiger.editor.PhotoState.prototype.ERROR: 
              this.view.error(this.state.errMsg); break;
            case xtiger.editor.PhotoState.prototype.UPLOADING: 
              this.view.loading(); break;
            case xtiger.editor.PhotoState.prototype.COMPLETE:             
              this.view.complete(this.state.genPhotoUrl()); break;
            default: 
              this.view.error('Unkown Photo status ' + this.state.status); break;
          }
        } else {
          // Allow monitoring only 1 photo upload at a time
          this.view.busy();
        }
      }
  };

  xtiger.factory('lens').registerWrapper('photo',  function (doc) { return new xtiger.editor.PhotoWrapper(doc); });

}($axel));
// file: axel/src/plugins/file.js
/* ***** BEGIN LICENSE BLOCK *****
 *
 * @COPYRIGHT@
 *
 * This file is part of the Adaptable XML Editing Library (AXEL), version @VERSION@ 
 *
 * @LICENSE@
 *
 * Web site : http://media.epfl.ch/Templates/
 * 
 * Author(s) : Stephane Sire
 * 
 * ***** END LICENSE BLOCK ***** */

////////////////////////////////////////////
// NOTE : this editor requires JQuery !!!
////////////////////////////////////////////

(function ($axel) {
  
  var _Generator = function ( aContainer, aXTUse, aDocument ) {
    var viewNode; 
    viewNode = xtdom.createElement (aDocument, 'span');
    xtdom.addClassName (viewNode , 'xt-file');
    $(viewNode).html(
      '<img class="xt-file-icon1"/><span class="xt-file-trans"/><input class="xt-file-id" type="text" value="nom"/><input class="xt-file-save" type="button" value="Enregistrer"/><span class="xt-file-perm"/><img class="xt-file-icon2"/>'
      );
    // xtdom.addClassName (viewNode , 'axel-drop-target');
    aContainer.appendChild(viewNode);
    return viewNode;
  };
  
  var EMPTY = 0;
  var SELECTED = 1;
  var LOADING = 2;
  var ERROR = 3;
  var COMPLETE = 4;
  var READY = 5;
  var FEEDBACK = { // permanent message visible next to the icon
      'fr' : [null, null, 'enregistrement en cours', "échec de l'enregistrement", 'enregistrement réussi', null]
      };
  var HINTS = { // tooltip message
      'fr' : ['cliquez pour choisir un fichier',
              ['cliquez sur “Enregistrer” pour sauvegarder “%” (%)', 'cliquez sur “Enregistrer” pour sauvegarder “%” (%)<br/>sous “%” (vous pouvez éditer le nom avant)'],
              'enregistrement de “%” (%) en cours',
              "échec de l'enregistrement de “%”<br/>%",
              '“%” a été enregistré en tant que <a target="_blank" href="%">%</a>',
              'cliquez pour remplacer <a target="_blank" href="%">%</a>' ]
      };
  function PURIFY_NAME (name) {
    var str = $.trim(name).toLowerCase(),
        res = (str.indexOf('.pdf') !== -1) ? str.substring(0, str.indexOf('.pdf')) : str;
    /* Replace multi spaces with a single space */
    res = res.replace(/(\s{2,}|_)/g,' ');
    /* Replace space with a '-' symbol */
    res = res.replace(/\s/g, "-");
    res = res.replace(/[éè]/g,'e'); // FIXME: improve
    res = res.replace(/[^a-z0-9-_]/g,'');
    return res;
  }

  // you may add a closure to define private properties / methods
  var _Editor = {

    ////////////////////////
    // Life cycle methods //
    ////////////////////////
    onInit : function ( aDefaultData, anOptionAttr, aRepeater ) {
      var base = this.getParam('file_base');
      if (base && (base.charAt(base.length - 1) !== '/')) { // sanitize base URL
        this._param.file_base = base + "/";
        // this.configure('file_base', base + "/")
      }
      this.model = new fileModel(this);
    },

    // Awakes the editor to DOM's events, registering the callbacks for them
    onAwake : function () {
      this.vIcon1 = $('.xt-file-icon1', this._handle);
      this.vTrans = $('.xt-file-trans', this._handle);
      this.vPerm = $('.xt-file-perm', this._handle);
      this.vIcon2 = $('.xt-file-icon2', this._handle);
      this.vSave = $('.xt-file-save', this._handle).hide();
      this.vId = $('.xt-file-id', this._handle).hide();
      // FIXME: we could remove this.vId in case file_gen_name param is 'auto'
      this.vIcon1.bind({
        'click' : $.proxy(_Editor.methods.onActivate, this),
        'mouseenter' : $.proxy(_Editor.methods.onEnterIcon, this),
        'mouseleave' : $.proxy(_Editor.methods.onLeaveIcon, this)
      });
      this.vIcon2.click( $.proxy(_Editor.methods.onDismiss, this) );
      this.vSave.click( $.proxy(_Editor.methods.onSave, this) );
      this.vId.change( $.proxy(_Editor.methods.onChangeId, this) );
      // manages transient area display (works with plugin css rules)
      $(this._handle).bind({
       mouseleave : function (ev) { $(ev.currentTarget).removeClass('over'); }
       // 'over' is set inside onEnterIcon
      });
      this.model.reset(this.getDefaultData());
      this.redraw(false);
      
    },

    onLoad : function (aPoint, aDataSrc) {
      var p, name, url = (aPoint !== -1) ? aDataSrc.getDataFor(aPoint) : this.getDefaultData();
      if (aDataSrc.hasAttributeFor('data-input', aPoint)) { // optional original file name
        p = aDataSrc.getAttributeFor('data-input', aPoint);
        name = aDataSrc.getDataFor(p);
      }
      this.model.reset(url, name);
      this.redraw(false);
      
    },

    onSave : function (aLogger) {
      var tmp;
      aLogger.write(this._dump());
      if ((this.model.legacy && this.model.legacy[2]) || (!this.model.legacy && this.model.name)) { // records original file name 
        tmp = this.model.legacy ? this.model.legacy[2] : this.model.name;
        aLogger.writeAttribute("data-input", tmp);
      }
    },

    ////////////////////////////////
    // Overwritten plugin methods //
    ////////////////////////////////
    api : {
      // no variation
    },

    /////////////////////////////
    // Specific plugin methods //
    /////////////////////////////
    methods : {

      getData : function () {
        return this.model;
      },

      _dump : function () {
        if (this.model.legacy) {
          return (this.model.legacy[1]) ? this.model.legacy[1] : '';
        } else {
          return (this.model.url) ? this.model.url : '';
        }
      },  

      // Updates display state to the current state, leaves state unchanged 
      // FIXME: rename to _setData ?
      redraw : function (doPropagate) {
        var UI = [
          // [ icon, true to display file name inside transient area, dismiss icon ]
          [ xtiger.bundles.file.noFileIconURL, true, null],
          [ xtiger.bundles.file.saveIconURL, false, xtiger.bundles.file.cancelIconURL],
          [ xtiger.bundles.file.spiningWheelIconURL, false, xtiger.bundles.file.cancelIconURL ],
          [ xtiger.bundles.file.errorIconURL, false, xtiger.bundles.file.cancelIconURL ],
          [ xtiger.bundles.file.pdfIconURL, false, xtiger.bundles.file.dismissIconURL ],
          [ xtiger.bundles.file.pdfIconURL, true, null ]
        ];
        var tmp;
        var config = UI[this.model.state];
        var msg = FEEDBACK.fr[this.model.state];
        // Updates widget view
        this.vIcon1.attr('src', config[0]);
        if ((this.model.state === EMPTY) || (this.model.state === READY)) {
          this.vIcon1.addClass('xt-file-editable');
        } else {
          this.vIcon1.removeClass('xt-file-editable');
        }
        if (config[1]) { // transient feedback (file name on mouse over)
          tmp = "“"+ (this.model.name || "pas de fichier") + "”";
          this.vTrans.text(tmp);
        } else {
          this.vTrans.text('');
        }
        if (this.model.state === SELECTED) { // save button
          if (this.getParam('file_gen_name') !== 'auto') {
            this.vId.val(this.model.name);
            this.onChangeId();
            this.vId.show();
          }
          this.vSave.show();
        } else {
          this.vSave.hide();
          this.vId.hide();
        }
        this.vPerm.text(msg || ''); // permanent feedback
        this.configureHints();
        if (config[2]) { // cancel / close icon
          this.vIcon2.attr('src', config[2]);
          this.vIcon2.removeClass('axel-core-off');
        } else {
          this.vIcon2.addClass('axel-core-off');
        }
        // auto-selection
        if ((this.model.state === COMPLETE) && (doPropagate)) {
          xtiger.editor.Repeat.autoSelectRepeatIter(this._handle);
        }
      },

      configureHints : function () {
        var a, i, tmp, tokens, vars, mb, kb, spec = HINTS.fr[this.model.state];
        if (this.model.state === SELECTED) {
          spec = spec[ (this.getParam('file_gen_name') === 'auto') ? 0 : 1 ];
        }
        if (spec.indexOf('%') !== -1) {
          a = [];
          if ((this.model.state === SELECTED) || (this.model.state === LOADING)) {
            if (this.model.size > 1024) {
              kb = this.model.size >> 10;
              if (kb > 1024) {
                mb = this.model.size >> 20;
                kb = (this.model.size - (mb << 20)) >> 10;
              } else {
                mb = 0;
              }
              tmp = mb >= 1 ? mb + '.' + kb + ' MB' : kb + ' KB';
            } else {
              tmp = this.model.size; 
            }
            vars = [this.model.name, tmp, this.vId.val()];
          } else if (this.model.state === ERROR) {
            vars = [this.model.name, this.model.err];
          } else if (this.model.state === COMPLETE) {
            vars = [this.model.name, this.model.genFileURL(), this.model.url];
          } else { // READY
            vars = [this.model.genFileURL(), this.model.url];
          }
          tokens = spec.split('%');
          for (i = 0; i < tokens.length; i++) { 
            a.push(tokens[i]); 
            if (i<vars.length) {
               a.push(vars[i]);
            }
          }
          this.model.hints = a.join('');
        } else {
          this.model.hints = spec;
        }
      },

      // FIXME: SHOULD NOT BE CALLED currently the plugin is not filterable and thus should not be updated 
      update : function (data) {
        this.model.reset(data);
        this.redraw(true);
      },

      /////////////////////////////////
      // User Interaction Management
      /////////////////////////////////
      onEnterIcon : function (ev) {
        $(ev.target.parentNode).addClass('over');
        if (this.model.hints) {
          tooltip = xtiger.factory('tooltipdev').getInstance(this.getDocument());
          if (tooltip) {
            // sticky tooltip iff the hints contains some link to click
            tooltip.show(this.vIcon1, this.model.hints, (this.model.hints.indexOf('<a') !== -1));
          }
        }
      },

      onLeaveIcon : function () {
        tooltip = xtiger.factory('tooltipdev').getInstance(this.getDocument());
        if (tooltip) {
          tooltip.hide();
        }
      },

      // Handles click on the action icon vIcon1
      // Shows file selection dialog and transitions to LOADING state unless cancelled
      onActivate : function (ev) {
        var fileDlg;
        if ((this.model.state === EMPTY) || (this.model.state === READY)) {
          fileDlg = xtiger.factory('fileinputsel').getInstance(this.getDocument());
          if (fileDlg) { 
            this.onLeaveIcon(); // forces tooltip dismiss because otherwise if may stay on screen
            fileDlg.showFileSelectionDialog( this );
          }
        }
      },

      doSelectFile : function ( file ) {
        this.model.gotoSelected(file);
      },

      // Handles click on the dismiss icon vIcon2
      onDismiss : function (ev) {
        if (this.model.state === LOADING) {
          this.model.cancelTransmission();
        } else if ((this.model.state === SELECTED) || (this.model.state === ERROR)) { 
          this.model.rollback((this.model.state === ERROR));
        } else if (this.model.state === COMPLETE) {
          this.model.gotoReady();
        }
      },

      onChangeId : function () {
        this.vId.val(PURIFY_NAME(this.vId.val()));
        this.vId.attr('size', this.vId.val().length + 2);
        this.configureHints();
        this.vId.blur();
      },

      onSave : function (ev) {
        this.model.gotoLoading();
      }
    }
  };

  $axel.plugin.register(
    'file', 
    { filterable: false, optional: true },
    { 
      file_URL : "/fileUpload",
      file_type : 'application/pdf',
      file_gen_name : 'auto'
      // file_size_limit : 1024
    },
    _Generator,
    _Editor
  );

  xtiger.resources.addBundle('file', 
    { 'noFileIconURL' : 'nofile32.png', 
      'saveIconURL' : 'save32.png', 
      'spiningWheelIconURL' : 'spiningwheel.gif',
      'errorIconURL' : 'bug48.png',
      'dismissIconURL' : 'ok16.png',
      'cancelIconURL' : 'cancel32.png',
      'pdfIconURL' : 'pdf32.png'
    } );
  
  /*****************************************************************************\
  |                                                                             |
  | Hidden file input button  - one per document                                |
  | Please configure CSS to hide it                                             |
  |                                                                             |
  \*****************************************************************************/
  var fileInputSelector = function ( doc ) {
    this.selector = xtdom.createElement(doc, 'input');
    $(this.selector).attr( { 'id' :  'xt-file-input', 'type' : 'file' } ).change( $.proxy(fileInputSelector.prototype.onChange, this) );
    $('body', doc).append(this.selector);
  };
  
  fileInputSelector.prototype = {
    showFileSelectionDialog : function ( editor ) {
      this.delegate = editor;
      this.selector.click();
    },
    onChange : function (ev) {
      var file = (ev.target.files.length > 0) ? ev.target.files[0] : null;
      var mtypes = this.delegate.getParam('file_type');
      if (file) {
        if (mtypes.indexOf(file.type) !== -1) {
          if (this.delegate) { this.delegate.doSelectFile(file); }
        } else {
          alert('Vous devez sélectionner un fichier PDF');
        }
      }
    }
  };
  
  xtiger.registry.registerFactory('fileinputsel', 
    {
      getInstance : function (doc) {
        var cache = xtiger.session(doc).load('fileinputsel');
        if (! cache) {
          cache = new fileInputSelector(doc);
          xtiger.session(doc).save('fileinputsel', cache);
        }
        return cache;
      }
    }
  );
  
  /*****************************************************************************\
  |                                                                             |
  | Tooltip device                                                              |
  |                                                                             |
  | FIXME:  - move to separate file                                             |
  \*****************************************************************************/
  var tooltipDevice = function ( doc ) {
    var tip = xtdom.createElement(doc, 'p');
    $(tip).attr('id', 'xt-tooltip');
    $('body', doc).append(tip);
    this.tooltip = $(tip);
    this.tooltip.mouseleave($.proxy(tooltipDevice.prototype.onLeaveTooltip, this));
    this.tooltip.mouseenter($.proxy(tooltipDevice.prototype.onEnterTooltip, this));
    this.doHideCb = $.proxy(tooltipDevice.prototype.doHide, this);
  };
  
  tooltipDevice.prototype = {
    show : function ( anchor, msg, sticky ) {
      var pos, delta;
      this.tooltip.html(msg);
      pos = $(anchor).offset();
      delta = this.tooltip.height() + $(anchor).height();
      this.tooltip.css({'left' : pos.left, 'top' : (pos.top - delta) }).show();
      this.isInside = true;
      this.isSticky = true; // FIXME: to be done
    },
    hide : function () {
      this.isInside = false;
      setTimeout(this.doHideCb, 500);
    },
    doHide : function () {
      if (!this.isInside || !this.isSticky) {
        this.tooltip.hide();
        this.inhibated = true;
      }
    },
    onLeaveTooltip : function (ev) {
      if (this.isInside && this.isSticky) {
        this.isInside = false;
        this.tooltip.hide();
      }
    },
    onEnterTooltip : function (ev) {
      this.isInside = true;
    }
  };
  
  xtiger.registry.registerFactory('tooltipdev', 
    {
      getInstance : function (doc) {
        var cache = xtiger.session(doc).load('tooltipdev');
        if (! cache) {
          cache = new tooltipDevice(doc);
          xtiger.session(doc).save('tooltipdev', cache);
        }
        return cache;
      }
    }
  );

   /*****************************************************************************\
   |                                                                             |
   | File input editor utility class to manage editor's state and model data     |
   |                                                                             |
   \*****************************************************************************/
   function fileModel (client) {
     this.state = READY;
     this.url = null;
     this.name = null;
     this.file = null; // File object when uploading
     this.delegate = client; 
     this.legacy = null; // real state while new content is beeing uploaded / confirmed
     this.preflighting = false;
   }
   
   fileModel.prototype = {
     
    // FIXME: load while a transmission is in progress ?
    reset : function (url, name) {
      if (url && (url.search(/\S/) !== -1)) {
        this.state = READY;
        this.url = url;
        this.name = name;
      } else {
        this.state = EMPTY;
        this.url = this.name = null;        
      }
    },
    
    // generates URL taking into account file_base parameter
    genFileURL : function () {
      var base = this.delegate.getParam('file_base');
      return (base ? base + this.url : this.url);
    },

    getPayload : function () {
      var id, payload = { 'xt-file' : this.file };
      if (this.preflighting) {
        payload['xt-file-id'] = this.delegate.vId.val();
        this.preflighting = false;
      }
      return payload;      
    },
    
    getPreflightOptions : function () {
      return { 'xt-file-preflight' : this.delegate.vId.val() };
    },
    
    rollback : function (fromErrorState) {
      if (fromErrorState && (this.preflighting)) {
        // just returns to selected state and cancel preflighting (sets it to false)
        this.state = SELECTED;
      } else if (this.legacy) {
        this.state = this.legacy[0];
        this.url = this.legacy[1];
        this.name = this.legacy[2];
        this.legacy = null;
      }
      this.preflighting = false;
      this.delegate.redraw();
    },
    
    gotoSelected : function (fileObj) {
      this.legacy = [this.state, this.url, this.name];
      this.state = SELECTED;
      this.url = null;
      this.name = fileObj.name;
      this.size = fileObj.size;
      this.file = fileObj;
      this.delegate.redraw();
    },
    
    gotoLoading : function () {
      // pre-check if state transition is possible
      var manager = xtiger.factory('upload').getInstance(this.delegate.getDocument());
      if (manager && manager.isReady()) {
        this.state = LOADING;
        // in case of immediate failure gotoError may be called in between
        // hence we have set the new state to LOADING before starting the transmission
        if (this.preflighting || (this.delegate.getParam('file_gen_name') === 'auto')) {
          this.startTransmission(manager, manager.getUploader());
          // getPayload will set preflighting to false
        } else {
          this.preflighting = true;
          this.startPreflight(manager, manager.getUploader());
        }
        this.delegate.redraw();
      } else {
        // FIXME: create a new state "upload will start when at least one other upload in progress will have been completed or aborted"
        alert("D'autre(s) téléchargement(s) sont en cours, attendez qu'ils se terminent ou bien annulez en un pour pouvoir démarrer un nouveau téléchargement");
      }
    },
    
    gotoComplete : function(value) {
      this.legacy = null; // accepts current state
      this.url = value;
      this.state = COMPLETE;
      this.delegate.redraw(true); // true to autoselect
    },

    // only exit from ERROR is rollback()
    gotoError : function() {
      this.state = ERROR;
      this.delegate.redraw();
    },
    
    gotoReady : function () {
      this.state = READY;
      this.delegate.redraw();
    },

    // Called after a transmission has started to retrieve the document id
    getDocumentId : function () {
      return xtiger.session(this.delegate.getDocument()).load('documentId');
    },

    startTransmission : function (manager, uploader) {
      this.transmission = uploader;
      this.transmission.setDataType('formdata');
      this.transmission.setAction(this.delegate.getParam('file_URL'));
      manager.startTransmission(this.transmission, this);
    },  

    startPreflight : function (manager, uploader) {
      this.transmission = uploader;
      this.transmission.setDataType('formdata');
      this.transmission.setAction(this.delegate.getParam('file_URL'));
      manager.startPreflight(this.transmission, this);
    },  

    cancelTransmission : function () {
      if (this.transmission) {
        var manager = xtiger.factory('upload').getInstance(this.delegate.getDocument());
        manager.cancelTransmission(this.transmission);
      }
    },

    // FIXME: handle more complex response protocol (e.g. with resourceId)
    onComplete : function (response) {
      if (this.preflighting) {
        // do not change state - proceed with upload (which may also fail on conflict !)
        this.gotoLoading();
      } else {
        this.gotoComplete($.trim(response));
        this.transmission = null;
      }
    },

    onError : function (error, code) {
      this.err = error;
      this.gotoError();
      this.transmission = null;
    },

    onCancel : function () {
      this.preflighting = false;
      this.transmission = null;
      if (this.legacy) {
        this.rollback();
      } else {
        this.reset();
        this.delegate.redraw();
      }
    }
  };  

}($axel));
// file: axel/src/plugins/link.js
/* ***** BEGIN LICENSE BLOCK *****
 *
 * @COPYRIGHT@
 *
 * This file is part of the Adaptable XML Editing Library (AXEL), version @VERSION@ 
 *
 * @LICENSE@
 *
 * Web site : http://media.epfl.ch/Templates/
 * 
 * Author(s) : Antoine Yersin, Stephane Sire
 * 
 * ***** END LICENSE BLOCK ***** */
 
(function ($axel) {

 var _Generator = function ( aContainer, aXTUse, aDocument ) {
   var _h = xtdom.createElement(aDocument, 'span'); /* Creates the handle */
   xtdom.addClassName (_h , 'axel-core-on');
   xtdom.addClassName (_h, 'axel-core-editable');
   xtdom.addClassName (_h, 'axel-link-handle');
   _h.appendChild(xtdom.createTextNode(aDocument, ''));
   aContainer.appendChild(_h);
   return _h;
 };

 // you may add a closure to define private properties / methods
 var _Editor = {

   ////////////////////////
   // Life cycle methods //
   ////////////////////////
   onInit : function ( aDefaultData, anOptionAttr, aRepeater ) {
     var devname = this.getParam('device') || this.getParam('defaultDevice');
     if (aDefaultData && aDefaultData.text && aDefaultData.url) { /* sets up initial content */
       this._setData(aDefaultData.text, aDefaultData.url);
     } else {
       this._setData('empty', 'http://');
     }
     this._device = xtiger.factory(devname).getInstance(this.getDocument());
   },

   onAwake : function () {
     var _this = this;
     xtdom.addEventListener (this._handle, this.getParam('trigger'), function (ev) {_this.startEditing(ev);}, true);
   },

   onLoad : function (aPoint, aDataSrc) {
     var _default,
         _url = aDataSrc.getDataFor(aDataSrc.getVectorFor('linkRef', aPoint)), 
         _text = aDataSrc.getDataFor(aDataSrc.getVectorFor('linkText', aPoint));
     this._setData(_text, _url);
     if (this.isOptional()) {
       if (_url || _text)
         this.set();
       else
         this.unset();
     }
     _default = this.getDefaultData();
     this.setModified((_text && _text !== _default.text) || (_url && _url !== _default.url));
   },

   // With default parameters generates link as : 
   // <linkRef>"the url of the link"</linkRef>
   // <linkText>"the text of the link"</linkText>
   onSave : function (aLogger) {
     if (this.isOptional() && !this.isSet()) {
       aLogger.discardNodeIfEmpty();
       return;
     }
     var _data = this.getData();
     aLogger.openTag(this.getParam('linkRefTagName'));
     aLogger.write(_data.url);
     aLogger.closeTag(this.getParam('linkRefTagName'));
     aLogger.openTag(this.getParam('linkTextTagName'));
     aLogger.write(_data.text);
     aLogger.closeTag(this.getParam('linkTextTagName'));
   },

   ////////////////////////////////
   // Overwritten plugin methods //
   ////////////////////////////////
   api : {
     
     // FIXME: first part is copied from Plugin original method, 
     // an alternative is to use derivation and to call parent's method
     _parseFromTemplate : function (aXTNode) {
       var tmp;
       this._param = {};
       xtiger.util.decodeParameters(aXTNode.getAttribute('param'), this._param);
       tmp = aXTNode.getAttribute('option');
       this._option = tmp ? tmp.toLowerCase() : null;
       // default content extraction differs from plugin original method
       // FIXME: awful parsing function. does not care about irrelevant text nodes
       var _aXTContent = aXTNode.childNodes;
       switch(_aXTContent.length) {
         case 2: /* <linkText>blah blah</linkText><linkRef>http://...</linkRef> */
           if (_aXTContent[0].nodeType == xtdom.ELEMENT_NODE
               && _aXTContent[1].nodeType == xtdom.ELEMENT_NODE
               && _aXTContent[0].nodeName == 'linkText'
               && _aXTContent[1].nodeName == 'linkRef')
             this._content = {
               text: _aXTContent[0].nodeValue,
               url: _aXTContent[1].nodeValue 
             };
           break;
         case 1:
           if (_aXTContent[0].nodeType == xtdom.ELEMENT_NODE && (/^a$/i).test(_aXTContent[0].nodeName)) {
             this._content = {
                 text: _aXTContent[0].firstChild.nodeValue,
                 url: _aXTContent[0].getAttribute('href')
             };
           } else if (_aXTContent[0].nodeType == xtdom.TEXT_NODE) {
             this._content = {
                 text: _aXTContent[0].nodeValue,
                 url: 'http://'
             };
           }
           break;
         default:
           this._content = { text: this.getParam('defaultText'), url: this.getParam('defaultUrl') }
       }
     },
     
     isFocusable: function () {
       return true;
     },
     
     focus: function () {
       this.startEditing();
     },
     
     unfocus: function () {
       this.stopEditing();
     }
   },

   /////////////////////////////
   // Specific plugin methods //
   /////////////////////////////
   methods : {
     
     _setData : function (aText, aUrl) {
       var _default;
       if (!aText || !aUrl) {
         _default = this.getDefaultData();
         this._data = {text: aText || _default.text, url: aUrl || _default.url};
      } else {
        this._data = {text: aText, url: aUrl}; 
      }
       this._handle.firstChild.data = this._data.text; /* sets the handle's text */
     },

     // Return a hash containing two fields, "url" and "data".
     getData: function () {
       return this._data;
     },

     update: function (aData) {
       if (aData && (aData.text !== this._data.text || aData.url !== this._data.url)) {
         if (!(aData.text || aData.url)) {
           this.clear(true);
         } else {
           this._setData(aData.text, aData.url);
           this.setModified(true);
           this.set(true);
         }
       }
     },
     
     clear: function (doPropagate) {
       var tmp = this.getDefaultData();
       this._setData(tmp.text, tmp.url);
       this.setModified(false);
       if (this.isOptional() && this.isSet())
         this.unset(doPropagate);
     },
     
     startEditing: function (aEvent) {
       var _doSelect = !this.isModified() || (aEvent && aEvent.shiftKey);
       this._device.startEditing(this, 'linkLensWrapper', _doSelect);
       if (aEvent) {
         xtdom.stopPropagation(aEvent);// otherwise stopEditing gets called on IE
       }
     },
     
     stopEditing : function () {
       this._device.stopEditing();
     }
   }
 };

 $axel.plugin.register(
   'link', 
   { filterable: true, optional: true },
   { 
     defaultText: 'enter link\'s text here',
     defaultUrl: 'http://',
     defaultDevice: 'lens', /* name of the device to use */
     wrapper: 'togglewrapper', /* name of the field wrapper to use */
     linkRefTagName: "linkRef", /* label used by the load/save method for the url info */
     linkTextTagName: "linkText", /* label used by the load/save method for the text info */
     trigger: "click",
     padding: '10'
   },
   _Generator,
   _Editor
 );
 
 xtiger.resources.addBundle('link', { 'gotoURL' : 'goto.png' } ); 
 
 //////////////////////////////////////
 // Lens Wrapper for the Link Editor //
 //////////////////////////////////////

  // Contains two editable fields and a "go" button to try the link
  var _LinkLensWrapper = function (aDocument) {
   this._handle; // wrapped HTML device
   this._handleToRestore; // handle to restore when releasing 
   this._document = aDocument; // document containing the wrapper 
   this._isFocused = false; // true if the focus is in one of the fields
   this._build();
  };

  _LinkLensWrapper.prototype = {

    // Initializes the wrapper. Creates the HTML elements and sets their style. 
    _build: function () {
     this._topDiv = xtdom.createElement(this._document, 'div');
     xtdom.addClassName(this._topDiv, 'axel-lens-container');
     xtdom.addClassName(this._topDiv, 'axel-lens-containerstyle');
     this._topDiv.style.display = 'block';
     this._upperP = xtdom.createElement(this._document, 'p');
     with (this._upperP) {
       style['margin'] = '0 0 15px 0';
       style['padding'] = '0px';
       style['width'] = '100%';
     }
     this._anchorInput = xtdom.createElement(this._document, 'input');
     with (this._anchorInput) {
       type = 'text';
     }
     xtdom.addClassName(this._anchorInput, 'axel-link-handle'); // use same class than the model's handle
     this._upperP.appendChild(this._anchorInput);
     this._topDiv.appendChild(this._upperP);
     this._lowerP = xtdom.createElement(this._document, 'p');
     with (this._lowerP) {
       style['margin'] = '0px';
       style['padding'] = '0px';
       style['width'] = '100%';
     }
     this._urlInput = xtdom.createElement(this._document, 'input');
     with (this._urlInput) {
       style['width'] = '75%';
     }
     this._goButtonLink = xtdom.createElement(this._document, 'a');
     with (this._goButtonLink) {
       href = ''; // is set when grabing
       target = '_blank';
       style['margin'] = '0 10px';
       style['width'] = '25%';
     }
     this._goButton = xtdom.createElement(this._document, 'img');
     with (this._goButton) {
       src = xtiger.bundles.link.gotoURL;
       style.height = '20px';
       style.width = '30px';
       style.display = 'inline';
       style['verticalAlign'] = 'bottom';
     }
     this._goButtonLink.appendChild(this._goButton);
     this._lowerP.appendChild(this._urlInput);
     this._lowerP.appendChild(this._goButtonLink);
     this._topDiv.appendChild(this._lowerP);   
    }, 

    // Sets the input fields value. If the given argument is null, the field
    // is kept in its current state. Use reset() to clear the fields.
    _setData : function (aText, aUrl) {
      if (aText && typeof(aText) === 'string')
       this._anchorInput.value = aText;
      if (aUrl && typeof(aUrl) === 'string') {
       this._urlInput.value = aUrl;
       this._goButtonLink.href = aUrl;
      }
    },

    // Returns the wrapped device.
    getHandle: function () {
     return this._topDiv;
    },        

    // Grabs the wrapper with the given device.
    grab: function (aDevice, aDoSelect, aPadding) {
     this._currentDevice = aDevice;
     var _data = this._currentDevice.getCurrentModel().getData();
     this._setData(_data.text, _data.url);
     var _handle = this._currentDevice.getCurrentModel().getHandle();      
     this._topDiv.style.padding = aPadding[0] + 'px ' + aPadding[1] + 'px';
     var _this = this;
     xtdom.addEventListener(this._anchorInput, 'focus', function (ev) {_this.onFocus(ev)}, false);
     xtdom.addEventListener(this._urlInput, 'focus', function (ev) {_this.onFocus(ev)}, false);
     xtdom.addEventListener(this._anchorInput, 'blur', function (ev) {_this.onBlur(ev)}, false);
     xtdom.addEventListener(this._urlInput, 'blur', function (ev) {_this.onBlur(ev)}, false);
     // adds principal input field margins and border to the padding     
     // FIXME: does not work - instead we use 4 which is empirical
     // var mtop = xtiger.editor.LayoutManager.prototype._getDistanceFor(this._urlInput, 'margin-top');
     // var btop = xtiger.editor.LayoutManager.prototype._getDistanceFor(this._urlInput, 'border-width-top');
     return [aPadding[0], aPadding[1] + 4];   
    },      

    // Terminates the wrapper installation after the lens has been made visible
    activate: function(aDevice, doSelectAll) {
     if (doSelectAll) {
       xtdom.focusAndSelect(this._anchorInput);
     } else { // simply focus
       this._anchorInput.focus();
     }
    },

    // Releases the wrapper, restores the handle
    release: function () {
     this._isFocused = false;
     xtdom.removeElement(this._topDiv);
     this._currentDevice = null;
    },

    // Toggle the focus between the fields
    toggleField: function () {                 
     if (this._isFocused) {
       if (this._focusedField == this._anchorInput) {
         this._anchorInput.blur();
         xtdom.focusAndMoveCaretTo(this._urlInput, this._urlInput.value.length);
       } else {
         this._urlInput.blur();
         xtdom.focusAndMoveCaretTo(this._anchorInput, this._anchorInput.value.length);
       }
     }
    },

    // Returns current data
    getData: function () {
     return {
       url: this._urlInput.value,
       text: this._anchorInput.value
     }
    },

    isFocusable: function () {
     return true;
    },

    // Handler for the bluring of input fields. Saves their state and updates
    // the link button's url accordingly.
    onBlur: function (ev) {
     var _target = xtdom.getEventTarget(ev);
     if (_target == this._urlInput)
       this._goButtonLink.href = this._urlInput.value;
     this._isFocused = false;
     this._focusedField = null;
     this._currentDevice.keepAlive(false);  
    },

    // Handler for the focusing in an input field. Toggles the wrapper's state such as it
    // does not disappear when the mouse leave it.
    onFocus: function (ev) {
     this._isFocused = true;
     this._currentDevice.keepAlive(true);
     this._focusedField = xtdom.getEventTarget(ev);
    }
  };

  xtiger.factory('lens').registerWrapper('linkLensWrapper', function (aDocument) {return new _LinkLensWrapper(aDocument)});
}($axel));
// file: axel/src/plugins/video.js
/* ***** BEGIN LICENSE BLOCK *****
 *
 * @COPYRIGHT@
 *
 * This file is part of the Adaptable XML Editing Library (AXEL), version @VERSION@ 
 *
 * @LICENSE@
 *
 * Web site : http://media.epfl.ch/Templates/
 * 
 * Author(s) : Antoine Yersin, Stéphane Sire
 * 
 * ***** END LICENSE BLOCK ***** */
 
(function ($axel) {

 var _Generator = function ( aContainer, aXTUse, aDocument ) {
   var _width, _height, _img, _tmp,
       _h = xtdom.createElement(aDocument, 'div');
   xtdom.addClassName (_h , 'axel-core-on');
   xtdom.addClassName (_h, 'axel-core-editable');
   _img = xtdom.createElement(aDocument, 'img');
   _img.src = xtiger.bundles.video.tvIconURL;
   _h.appendChild(_img);
   // Sets handle width and height;
   _tmp = xtdom.createElement(aDocument, 'div');
   _tmp.style.visibility = 'hidden';
   aDocument.getElementsByTagName('body')[0].appendChild(_tmp);
   _tmp.appendChild(_h);
   _width = _img.offsetWidth;
   _height = _img.offsetHeight;
   _h.style.width = (_width > 2 ? _width : 80) + 'px'; // defeat bug when transformed in a displayed: none context
   _h.style.height = (_height > 2 ? _height : 80) + 'px';
   aContainer.appendChild(_h);
   xtdom.removeElement(_tmp);
   return _h;   
 };

 var _Editor = {

   ////////////////////////
   // Life cycle methods //
   ////////////////////////
   onInit : function ( aDefaultData, anOptionAttr, aRepeater ) {
     if (aDefaultData) { /* sets up initial content */
       if (this._isValidUrl(aDefaultData) || this._isCodeSnippet(aDefaultData)) {
         this._setData(aDefaultData);
       } else { // short-hand for setting that parameter
         this._data = '';         
         this._param.inputFieldMessage = aDefaultData;
         // this.configure('inputFieldMessage', aDefaultData);
       }
     }
     var devname = this.getParam('device') || this.getParam('defaultDevice');
     this._device = xtiger.factory(devname).getInstance(this.getDocument());
     // HTML element to represents an editor containing no data 
     this._noData = this._handle.firstChild; // saves <img> icon
   },

   // Awakes the editor to DOM's events, registering the callbacks for them
   onAwake : function () {
     var _this = this; // closure
     xtdom.addEventListener (this._handle, 'mouseover', function (ev) {_this.startEditing(ev);}, true);
   },

   onLoad : function (aPoint, aDataSrc) {
     if (aPoint !== -1) {
       var _value = aDataSrc.getDataFor(aPoint); 
       this._setData(_value) || this.clear();
       this.set(false);        
     } else {
       this.clear()
       this.unset(false);
     }
   },

   onSave : function (aLogger) {
     if (this.isOptional() && !this.isSet()) {
       aLogger.discardNodeIfEmpty();
     } if (this._data) { 
        aLogger.write(this._data);
     } // otherwise empty node => no content (will be an empty XML tag)
   },

   ////////////////////////////////
   // Overwritten plugin methods //
   ////////////////////////////////
   api : {
     
     // FIXME: first part is copied from Plugin original method, 
     // an alternative is to use derivation and to call parent's method
     _parseFromTemplate : function (aXTNode) {
       var tmp, _cur, _data;
       this._param = {};
       xtiger.util.decodeParameters(aXTNode.getAttribute('param'), this._param);
       tmp = aXTNode.getAttribute('option');
       this._option = tmp ? tmp.toLowerCase() : null;
       // sets default content, this diverges from basic plugin
       _cur = aXTNode.firstChild;
       while (_cur && !_data) {
         switch (_cur.nodeType) {
           case xtdom.TEXT_NODE :
             if ((/\w+/).test(_cur.nodeValue)) {
               _data = _cur.nodeValue;
             }
             break;
           case xtdom.ELEMENT_NODE :
             if (_cur.localName = 'object') {
               _data = _cur;
             }
         }
         _cur = _cur.nextSibling;
       }
       this._content = _data;
    },

    isFocusable: function () {
      return true;
    },
    
    focus: function () {
      this.startEditing();
    },
    
    unfocus: function () {
      this._device.stopEditing();
    }
   },

   /////////////////////////////
   // Specific plugin methods //
   /////////////////////////////
   methods : {
     // Tests if the input is a valid URL (no trailing nor leading spaces allowed)
     _isValidUrl : function (aInput) {
       var _URL_R = /^(http\:\/\/|~\/|\/)?(\w+:\w+@)?(([-\w\d{1-3}]+\.)+(com|org|net|gov|mil|biz|info|mobi|name|aero|jobs|edu|co\.uk|ac\.uk|it|fr|tv|museum|asia|local|travel|[a-z]{2})?)(?::[\d]{1,5})?(?:(?:(?:\/(?:[-\w~!$+|.,=]|%[a-f\d]{2})+)+|\/)+|\?|#)?(?:(?:[\?&](?:[-\w~!$+|.,*:]|%[a-f\d{2}])+=?(?:[-\w~!$+|.,*:=]|%[a-f\d]{2})*)(?:&(?:[-\w~!$+|.,*:]|%[a-f\d{2}])+=?(?:[-\w~!$+|.,*:=]|%[a-f\d]{2})*)*)*(?:#(?:[-\w~!$+|.,*:=]|%[a-f\d]{2})*)?(?:&)?$/;
       return _URL_R.test(aInput);
     },

     // Removes leading and trailing spaces
     _removeLTSpaces : function (aInput) {
       if (!aInput || aInput == '')
         return '';
       return aInput.replace(/^\s+|\s+$/g, '');
     },

     // Builds a valid YouTube's snippet (as HTML element) from a video ID
     _buildYoutubeSnippet : function (aVideoID, aSize, aParams) {
       var _params = aParams ? aParams : {};
       _params['movie'] = aVideoID;
       if (!_params['allowFullScreen'])
         _params['allowFullScreen'] = 'true';
       if (!_params['alloscriptaccess'])
         _params['alloscriptaccess'] = 'always';
       var _obj = xtdom.createElement(this._document, 'object');
       if (aSize) {
         _obj.height = aSize[0];
         _obj.width = aSize[1];
       } else {
         _obj.height = this.getParam('height');
         _obj.width = this.getParam('width');
       }
       _obj.style.zIndex = 1000;
       for (var _param in _params) {
         var _p = xtdom.createElement(this._document, 'param');
         _p.name = _param;
         _p.value = _params[_param];
         _obj.appendChild(_p);
       }
       var _embed = xtdom.createElement(this._document, 'embed');
       xtdom.setAttribute(_embed, 'src', aVideoID);
       xtdom.setAttribute(_embed, 'type', 'application/x-shockwave-flash');
       xtdom.setAttribute(_embed, 'allowfullscreen', 'true');
       xtdom.setAttribute(_embed, 'allowscriptaccess', 'always');
       xtdom.setAttribute(_embed, 'width', this.getParam('width'));
       xtdom.setAttribute(_embed, 'height', this.getParam('height'));
       _embed.style.zIndex = 1000;
       if (xtiger.cross.UA.IE) {
         _obj = _embed;  
       } else {
         _obj.appendChild(_embed);
       }
       return _obj;
     },

     // Extracts the youtube's video id from a valid link to the video (either the "permalink" or the page's link)
     _extractVideoId : function (aValidUrl) {
       var _tmp = aValidUrl.match(/^[^&]*/)[0];
       return _tmp.match(/[^\=\/]*$/)[0];
     },

     // Returns true of the given input is a code snippet
     _isCodeSnippet: function (aInput) {
       var _SNIPPET_O_R = /(<object>).*(<param[^>]*(name\="movie"))/;
       var _SNIPPET_E_R = /(<embed\s)([^>]+)(\ssrc\=")([^"]+)"/;
       return _SNIPPET_O_R.test(aInput) || _SNIPPET_E_R.test(aInput);
     },

     // Changes the handler content to show a video player if aData 
     // is a valid YouTube URL and as a side effects calls this.setModified(true).
     // Returns true if it succeeds or false otherwise (in which case the handler's content is preserved)
     _setData: function (aData) {
       var _newContent, _tmp,
           _type = 'youtube', //_extractType(aData);
           _tdata = this._removeLTSpaces(aData);
       if (!this._isValidUrl(_tdata)) {
         if (this._isCodeSnippet(_tdata))
           _tdata = this._extractUrlFromSnippet(_tdata);
         else
           return false;
       }
       switch (_type) {
         case 'youtube':
           var _videoID = this._extractVideoId(_tdata);
           var _newdata = 'http://www.youtube.com/v/' + _videoID;
           if (this._data === _newdata)
             return false; // No update
           this._data = _newdata; // Updates the model
           _newdata += '&hl=' + this.getParam('lang') + '&fs=1&';
           _newContent = this._buildYoutubeSnippet(this._data, null, null);
           try {
             // Sets the correct handle's width and height by using a temp container
             _tmp = xtdom.createElement(this._document, 'div');
             _tmp.style.visibility = 'hidden';
             this._document.getElementsByTagName('body')[0].appendChild(_tmp);
             _tmp.appendChild(_newContent);
                 with (this._handle.style) {
                   width = this.getParam('width') + 'px'; //_newContent.offsetWidth + 'px'; // Defeat bug with the size of an <object>
                   height = this.getParam('height') + 'px'; //_newContent.offsetHeight + 'px'; // TODO fix once a dynamic computation of size
                 }
                 // Appends the new content in the handle
                 this._handle.replaceChild(_newContent, this._handle.firstChild);
                 this.setModified(true);
                 // Remove the temp container
                 xtdom.removeElement(_tmp);
               }
           catch (err) {
             xtiger.cross.log('warning', err);
             return false;
           }
           break;
         default :
           xtiger.cross.log('warning', 'Video type ' + type + ' is currently unsupported');
           return false;
       }
       return true; // success
     },

     // Updates this editor with the given data. The data must provide the url
     // to the video, either by giving it directly, or by giving the whole snippet.
     update: function (aData) { 
       var _success = false;     
       if (aData && (typeof(aData) == 'string') && (aData.search(/\S/) != -1)) {
         _success = (aData === this._data) || this._setData(aData);
         // the first term in case user had unselected optional video
         // and tries to select it again by validating it's URL again
       }
       if (_success) { // auto-selection of editor if necessary
         this.set(true);
       }
     },

     // Clears the editor, reseting it to a state where it does not contains any video. 
     // Does not change the selection state.
     clear: function () {
       this._data = ''; // FIXME: this will serialize an empty string as XML content ?
       this.setModified(false);
       this._handle.replaceChild(this._noData, this._handle.firstChild);
       var _width = this._noData.offsetWidth;
       var _height = this._noData.offsetHeight;
       with (this._handle.style) {
         width = (_width > 2 ? _width: 80) + 'px'; // defeat bug if called in a display:none context
         height = (_height > 2 ? _height: 80) + 'px';
       }
     },

     // Returns the editor's current data
     getData: function () {
       if (this._data && this._data !== '') {
         return this._data;
       } else {
         return null;
       }
     },

     startEditing: function (aEvent) {
       var _doSelect = !this.isModified() || (aEvent && aEvent.shiftKey);
       this._device.startEditing(this, 'videoLensWrapper', _doSelect);
     },

     stopEditing : function () {
       this._device.stopEditing();
     }     
   }
 };

 $axel.plugin.register(
   'video', 
   { filterable: true, optional: true },
   { 
     defaultDevice: 'lens', /* name of the device to use */
     trigger: 'mouseover',
     lang: 'fr_FR', /* lang's code for player's GUI (must respect the video's provider's standards) */
     inputFieldMessage: 'Paste the video\'s link here', /* text appearing in the input field if no valid data is hold by the model */
     width: 425, /* width of the flash video player */
     height: 344 /* height of the flash video player */
   },
   _Generator,
   _Editor
 );
 
 xtiger.resources.addBundle('video', { 'tvIconURL' : 'tv.png' } );
 
 ///////////////////////////////////////
 // Lens Wrapper for the Video Editor //
 ///////////////////////////////////////
 var _VideoLensWrapper = function (aDocument) {
   this._handle; // wrapped HTML device
   this._handleToRestore; // handle to restore when releasing
   this._document = aDocument; // document containing the wrapper 
   this._isFocused = false; // true if the focus is in one of the fields
   this._loaded = false; // true the model is loaded with valid data
   this.build();
 }

 _VideoLensWrapper.prototype = {

   build : function() {
     this._topdiv = xtdom.createElement(this._document, 'div');
     xtdom.addClassName(this._topdiv, 'axel-lens-container');
     with (this._topdiv) {
       style.display = 'none';
       style.minWidth = '200px';
     }
     var _innerHTML = '';
     // mask
     _innerHTML += '<div style="background: none; position: relative"> </div>';
     // div
     _innerHTML += '<div class="axel-lens-containerstyle" style="width: 410px; padding: 5px; position: relative">';
     _innerHTML += '<p style="';
     _innerHTML += 'display: none; font-size: 7pt; cursor: pointer; ';
     _innerHTML += 'text-decoration:underline; text-align: right; margin: 0;';
     _innerHTML += '">delete</p>';
     _innerHTML += '<div>';
     _innerHTML += '<label for="videolensinput" style="display: block">Paste url here</label>';
     _innerHTML += '<input type="text" name="videolensinput" value="" style="width: 90%"></input>';
     _innerHTML += '</div>';
     _innerHTML += '<div style="text-align: center">';
     _innerHTML += '<button>Cancel</button>';
     _innerHTML += '<button>Save</button>';
     _innerHTML += '</div></div>';
     this._topdiv.innerHTML = _innerHTML;
     this._maskdiv = this._topdiv.firstChild;
     this._contentdiv = this._maskdiv.nextSibling;
     this._deletespan = this._contentdiv.firstChild;
     this._inputdiv = this._deletespan.nextSibling;
     this._input = this._inputdiv.firstChild.nextSibling;
     this._buttondiv = this._inputdiv.nextSibling;
     this._cancelbutton = this._buttondiv.firstChild;
     this._savebutton = this._buttondiv.firstChild.nextSibling;
     // event handlers
     var _this = this;
     this._handlers = {
       clearModel : [ this._deletespan, 'click', function(ev) { _this.clearModel() } ],
       onInputBlur : [ this._input, 'blur', function(ev) { _this._onInputBlur(ev) } ],
       onInputFocus : [ this._input, 'focus', function(ev) { _this._onInputFocus(ev) } ],
       onInputKeyDown : [ this._input, 'keydown', function(ev) { _this._onInputKeyDown(ev) } ],
       onInputKeyUp : [ this._input, 'keyup', function(ev) { _this._onInputKeyUp(ev) } ],
       onCancel : [ this._cancelbutton, 'click', function(ev) { _this._onCancel(ev) } ],
       onSave : [ this._savebutton, 'click', function(ev) { _this._onSave(ev) } ]
     }
   },

   // Grabs the wrapper, awakes its listeners and displays it
   grab : function(aDevice, aDoSelect, aPadding) {
     if (this._currentDevice) {
       this.release();
     }
     this._currentDevice = aDevice;
     var _handle = this._currentDevice.getCurrentModel().getHandle();
     _pad = (aPadding[0] >= 10) ? aPadding[0] : 10;

     // fixes elements' size
     var _width = _handle.offsetWidth;
     var _height = _handle.offsetHeight;
     if (xtiger.cross.UA.IE) { // IE does include padding in elements' width and height
       _width += 2 * _pad;
       _height += 2 * _pad;
     }
     with (this._topdiv.style) {
       display = 'block';
       width = _width + 'px';
       padding = _pad + 'px';
     }
     with (this._maskdiv.style) {
       border = '' + _pad + 'px solid rgb(115, 166, 42)';
       width = _width + 'px';
       height = _height + 'px';
       if (!xtiger.cross.UA.IE) { // all browser but IE
         left = '-' + _pad + 'px';
         top = '-' + _pad + 'px';
       }
     }
     with (this._contentdiv.style) {
       if (!xtiger.cross.UA.IE) {
         left = '-' + _pad + 'px';
         top = '-' + _pad + 'px';
       }
     }

     this._cancelbutton.disabled = false; // always enabled
     this._savebutton.disabled = true; // enabled only once data has been input

     // Updates input's value
     if (this._currentDevice.getCurrentModel().isModified()) {
       this.setData(this._currentDevice.getCurrentModel().getData());
       this._deletespan.style.display = 'block';
       this._loaded = true;
     } else {
       var _message = this._currentDevice.getCurrentModel().getParam('inputFieldMessage');
       this.setData(_message); // defeat IE and opera's "null" bug
       this._loaded = false;
     }

     // subscribes to events
     for ( var k in this._handlers) {
       xtdom.addEventListener(this._handlers[k][0], this._handlers[k][1],
           this._handlers[k][2], true);
     }
   },

   // Terminates the wrapper installation after the lens has been made visible 
   activate : function(aDevice, doSelectAll) {
     // nope
   },

   // Releases the wrapper, unregisters all events handlers  
   release : function() {
     if (!this._currentDevice)
       return;
     // unsubscribes from events
     for ( var k in this._handlers) {
       xtdom.removeEventListener(this._handlers[k][0], this._handlers[k][1],
           this._handlers[k][2], true);
     }
     this._deletespan.style.display = 'none';
     this._currentDevice = null;
     xtdom.removeElement(this._topdiv);
   },

   getHandle : function() {
     return this._topdiv;
   },

   // Returns the input field content.
   getData : function() {
     return this._input.value;
   },

   // Sets the data hold by the wrapper's input field.
   setData : function(aData) {
     // defeat IE and opera's "null" bug
     this._input.value = (aData && typeof (aData) == 'string') ? aData : '';
   },

   isFocusable : function() {
     return true;
   },

   // Asks the model to clear itself
   clearModel : function() {
     if (this._currentDevice) {
       this._input.value = '';
       this._currentDevice.getCurrentModel().clear();
       this._currentDevice.keepAlive(false);
       this._currentDevice.getCurrentModel().unfocus();
     }
   },

  // Toggles between the lens' fields. Useless here as the lens only has one field
   toggleField : function() {
     // nope, only one field
   },

   // Event handler called when the input field losts the focus.
   _onInputBlur : function(ev) {
     this._currentDevice.keepAlive(false);
   },

   // Event handler called when the input field gains the focus
   _onInputFocus : function(ev) {
     if (this._loaded) {
       var _aStartPos = 0;
       var _aEndPos = this._input.value.length;

       if (this._input.setSelectionRange) {
         this._input.setSelectionRange(_aStartPos, _aEndPos);
       } else if (this._input.createTextRange) { // IE
         var oRange = this._input.createTextRange();
         oRange.moveStart("character", _aStartPos);
         oRange.moveEnd("character", _aEndPos);
         oRange.select();
       }
     } else {
       this._input.value = '';
     }
     this._currentDevice.keepAlive(true);
   },

   // Saves the current value of the input. This value is used later to enable the buttons.
   _onInputKeyDown : function(ev) {
     this._savedValue = this._input.value;
   },

   // Detects the keyup event on the input field. 
   // If the input's value has changed, buttons are awakened
   _onInputKeyUp : function(ev) {
     if (this._input.value != this._savedValue) {
       this._cancelbutton.disabled = false;
       this._savebutton.disabled = false;
     }
   },

   // Event handler for a click on the "cancel" button
   _onCancel : function(ev) {
     if (!this._currentDevice)
       return;
     this._currentDevice.cancelEditing();
     xtdom.stopPropagation(ev);
   },

   // Event handler for a click on the "save" button 
   _onSave : function(ev) {
     if (!this._currentDevice)
       return;
     this._currentDevice.stopEditing();
     xtdom.stopPropagation(ev);
   }
 }

 xtiger.factory('lens').registerWrapper('videoLensWrapper', function (aDocument) {return new _VideoLensWrapper(aDocument)}); 

}($axel));

// file: axel/src/filters/event.js
/* ***** BEGIN LICENSE BLOCK *****
 *
 * @COPYRIGHT@
 *
 * This file is part of the Adaptable XML Editing Library (AXEL), version @VERSION@
 *
 * @LICENSE@
 *
 * Web site : https://github.com/ssire/axel
 *
 * Author(s) : Stephane Sire
 *
 * ***** END LICENSE BLOCK ***** */

/*****************************************************************************\
|                                                                             |
|  AXEL 'event' filter                                                        |
|                                                                             |
|  Sends event on some plugin method calls                                    |
|  To be used to create user interactions not supported natively with AXEL    |
|  for instance in conjunction with the $axel wrapped set                     |
|                                                                             |
|*****************************************************************************|
|  Prerequisite: jQuery                                                       |
|                                                                             |
\*****************************************************************************/
(function ($axel) {

  var _Filter = {

    methods : {
      update : function (aData) {
        this.__event__update(aData);
        // triggers 'axel-update' event
        $(this.getHandle()).trigger('axel-update', this);
      }
    }
  };

  $axel.filter.register(
    'event',
    { chain : [ 'update'] },
    null,
    _Filter);
  $axel.filter.applyTo({'event' : 'text'});
}($axel));

// file: axel/src/filters/optional.js
/* ***** BEGIN LICENSE BLOCK *****
 *
 * @COPYRIGHT@
 *
 * This file is part of the Adaptable XML Editing Library (AXEL), version @VERSION@ 
 *
 * @LICENSE@
 *
 * Web site : https://github.com/ssire/axel
 * 
 * Author(s) : Stephane Sire
 * 
 * ***** END LICENSE BLOCK ***** */

/*****************************************************************************\
|                                                                             |
|  AXEL 'optional' filter                                                     |
|                                                                             |
|  Only serializes data to XML if it is different from the default data       |
|  WARNING: currently this is a READONLY filter, it does not support loading  |
|  XML data                                                                   |
|                                                                             |
|*****************************************************************************|
|  Prerequisite: none                                                         |
|                                                                             |
\*****************************************************************************/
(function ($axel) {

  var _Filter = {
    
    onSave : function (aLogger) {
      if (this.isModified()) {
        this.__optional__onSave(aLogger);
      } else {
        aLogger.discardNodeIfEmpty();
      }
    }
  };

  $axel.filter.register(
    'optional', 
    { chain : [ 'onSave'] },
    null,
    _Filter);
  $axel.filter.applyTo({'optional' : 'text'});
}($axel));

// file: axel/src/filters/image.js
/* ***** BEGIN LICENSE BLOCK *****
 *
 * @COPYRIGHT@
 *
 * This file is part of the Adaptable XML Editing Library (AXEL), version @VERSION@ 
 *
 * @LICENSE@
 *
 * Web site : https://github.com/ssire/axel
 * 
 * Author(s) : Stephane Sire
 * 
 * ***** END LICENSE BLOCK ***** */

/*****************************************************************************\
|                                                                             |
|  AXEL 'image' filter                                                        |
|                                                                             |
|  Interprets data as an image URL or path                                    |
|  Replaces the handle with an img tag                                        |
|                                                                             |
|*****************************************************************************|
|  Compatiblity: 'text' plugin                                                |
|                                                                             |
\*****************************************************************************/
(function ($axel) {

  // Tracker menu device getter / setter
  // There should be only one such device per-document
  var _getDevice = function _getDevice (aDoc, aFilterTarget, dontCreate) {
    var devKey = 'trackerdevice';
    var device = xtiger.session(aDoc).load(devKey);
    if ((! device) && (! dontCreate)) {  // lazy creation
      device = new xtiger.editor.TrackerMenu(aDoc, [{
          'zoomout' : ['---', aFilterTarget.zoomOut], 
          'zoomin' : ['+++', aFilterTarget.zoomIn]
        }]);
      xtiger.session(aDoc).save(devKey, device);
    }
    return device;
  };                             

  // Replaces handle text content by <img> tag
  // If optional w and h are given sets image size once loaded
  function _genImageInside (editor, src, w, h) {
    var handle = editor.getHandle(),
        cur = xtdom.createElement(editor.getDocument(), 'img'),
        base;
    if (editor.image_resizable) { // FIXME: not sure this is really needed (GC...)
      $('img', handle).unbind('mouseenter');
    }                 
    xtdom.removeChildrenOf(handle);           
    if ((w !== undefined) || (h !== undefined)) {
      // pre-defined size (loading from XML data file)
      $(cur).one('load', [handle, w, h], _onLoad);
    }
    if (src.substr(0,5) !== 'http:') {
      base = editor.getParam('base');
    }
    xtdom.setAttribute(cur, 'src', base ? base + src : src);
    xtdom.setAttribute(cur, 'alt', 'image ' + src);
    handle.appendChild(cur);       
    // imposes optional size constraints through CSS max-width / max-height
    // this way no need to wait image upload to adjust it
    if (editor.image_maxWidth !== undefined) {
      $(cur).css('max-width', editor.image_maxWidth);
    }
    if (editor.image_maxHeight !== undefined) {
      $(cur).css('max-height', editor.image_maxHeight);
    }   
    // optional resizing behavior
    if (editor.image_resizable) {
      $(cur).bind('mouseenter', editor, _onMouseEnter);
    }   
  }
   
  // Adjusts image width and height to pre-defined once
  // also adjusts handle width to the same
  function _onLoad (ev) { 
    var handle = ev.data[0],
        wrapper = $('img', handle),
        w = ev.data[1],
        h = ev.data[2];                
    if (w && (! isNaN(w)) && (w > 0)) {
      wrapper.width(w);
    }
    if (h && (! isNaN(h)) && (h > 0)) {
      wrapper.height(h);
    }
    $(handle).width(wrapper.width());
  }

  // Retrieves image source from model data inside editor
  function _getImageSrcFromHandle (editor) {
    var url;
    var h = editor.getHandle();
    var base = editor.getParam('base');
    var cur = h.firstChild;
    if (cur.nodeType !== xtdom.TEXT_NODE) { // it's a filter generated <img>
      url = cur.getAttribute('src');
    } else {
      url = cur.data;
    } 
    return (base && (url.indexOf(base) !== -1)) ? url.substr(base.length, url.length) : url;
  }       
                          
  // Converts a dimension such as "200" or "200px" into integer value
  // Returns undefined in case of failure or the argument is not a string (e.g. undefined)
  // FIXME: see how to handle other units than "px" (e.g. % or cm)
  function _dim2int (value) { 
    var m, res = undefined;
    if ((typeof value) === "string") {
      m = value.match(/\d+/);
      if (m) {
        res = parseInt(m[0]);
      }
    }
    return res;
  }       

  ////////////////////////////////////////////////////////////
  // Drag and drop callbacks
  ////////////////////////////////////////////////////////////

  // This is required to accept drop
  function _onDragEnter (ev) {  
    var isLink;
    if (ev.dataTransfer.types.contains) { // FF
      isLink = ev.dataTransfer.types.contains("text/uri-list"); // "text/x-moz-url"
    } else { // Safari does not support contains
      isLink = ($.inArray("text/uri-list", ev.dataTransfer.types) !== -1);
    }
    if (isLink) {               
      ev.dataTransfer.dropEffect = xtiger.cross.UA.webKit ? "copy" : "link";    
      // drag from Safari to Safari sets effectAllowed to copyMove hence sets a compatible dropEffect
      // see Apple's "Using Drag and Drop From JavaScript" doc
      xtdom.preventDefault(ev);
      xtdom.stopPropagation(ev);
    }
  }       

  function _onDragOver (ev) {                  
    ev.dataTransfer.dropEffect = xtiger.cross.UA.webKit ? "copy" : "link";    
    xtdom.preventDefault(ev);  
    xtdom.stopPropagation(ev);  
  }       

  // FIXME: we should subscribe to the image too when there is an image
  // because it masks the div drop dataTransfer content  
  // https://developer.mozilla.org/En/DragDrop/Drag_Operations#drop
  function _onDrop (ev) {     
    var found = false;
    var model = ev.target.xttPrimitiveEditor || ev.target.parentNode.xttPrimitiveEditor;
    if (model) {                      
      var link =  ev.dataTransfer.getData("URL");
      if (! link) { // fall back, as far as I have seen "text/uri-list" implies test/plain in most cases
        link = ev.dataTransfer.getData("text/plain");
      }      
      // FIXME: manage a file reference from the file system drop on FF
      if (link && (link.search(/(png|jpg|jpeg|gif)$/i) !== -1)) {
        model.update(link); // same as user input
      } else {
        xtiger.cross.log('warning', 'Not a supported image link (must end with png, jpg, jpeg or gif) !\n');
      }
    }
    xtdom.stopPropagation(ev);
    xtdom.preventDefault(ev);
  }   

  function _onMouseEnter (ev) {
    // this is the <img> event target set by jQuery
    var w, h, cdeState = {}, tmp;
    var self = ev.data, 
        _tracker = _getDevice(self.getDocument(), self);
    if (! _tracker.isTracking()) { // avoid reentrant calls (e.g. when moving out from the button)
      // computes commands state
      w = $(this).width();
      h = $(this).height();  
      if (self.image_minWidth && self.image_minHeight) {
        cdeState['zoomout'] = (w > self.image_minWidth) && (h > self.image_minHeight);
      } else if (self.image_minWidth) {
        cdeState['zoomout'] = (w > self.image_minWidth);
      } else if (self.image_minHeight) {
        cdeState['zoomout'] = (h > self.image_minHeight);
      } else {
        cdeState['zoomout'] =  false;
      }
      if (self.image_maxWidth && self.image_maxHeight) {
        cdeState['zoomin'] = (w < self.image_maxWidth) && (h < self.image_maxHeight);
      } else if (self.image_maxWidth) {
        cdeState['zoomin'] = (w < self.image_maxWidth);
      } else if (self.image_maxHeight) {
        cdeState['zoomin'] = (h < self.image_maxHeight);
      } else {
        cdeState['zoomin'] =  false;
      }
      _tracker.startEditing(self, this, cdeState);  
    } //else xtiger.cross.log('debug', '[Image filter] avoiding reentrant MouseEnter call');
  }

  var imageFilterMixin = {  
    
    onAwake : function () { 
      var curP;
      this.__image__onAwake();
      // FIXME: experimental feature for FF - could be factorized inside text editor ?
      // FIXME: there should be an uninit to remove event listeners
      var h = this.getHandle();
      xtdom.addEventListener (h, "dragenter", _onDragEnter, false);  
      xtdom.addEventListener (h, "dragover", _onDragOver, false);       
      xtdom.addEventListener (h, 'drop', _onDrop, true);
      // converts image_ size contraint to integer (could be handle at the getParam level ?)
      this.image_maxWidth = _dim2int(this.getParam("image_maxwidth")); 
      this.image_maxHeight = _dim2int(this.getParam("image_maxheight"));
      this.image_minWidth = _dim2int(this.getParam("image_minwidth")); 
      this.image_minHeight = _dim2int(this.getParam("image_minheight"));
      this.image_resizable = this.image_maxWidth || this.image_maxHeight || this.image_minWidth || this.image_minHeight;
    },
    
    // Loads XML data from the point into the editor
    // Converts it to an XHTML representation
    onLoad : function (point, dataSrc) {
      var src, tagname = this.getParam('image-tag') || 'Source', w, h;
      // if (! dataSrc.isEmpty(point)) {  // FIXME: a node with only an attribute is treated as empty
      var n = point[0];
      if (this.getParam('image_lang') === 'html') {
        //FIXME: point[1] : this depends on DOMDataSource API !       
        n = point[1]; // supposes 'img' tag
        tagname = 'src';
      }         
      if (n && xtdom.hasAttribute(n, tagname)) {
        src = n.getAttribute(tagname);
      }
      // }    
      if ((! src) || (src.search(/(png|jpg|jpeg|gif)$/i) === -1)) { // no image
        this.__image__onLoad(point, dataSrc);          
        // FIXME: should we replace content with an error message instead ?
      } else {
        if (this.image_resizable) { // parses and applies width and height
          // FIXME: should wait load event ?
          w = parseInt(n.getAttribute('width'));
          h = parseInt(n.getAttribute('height'));
          _genImageInside(this, src, w, h);
        } else {
          _genImageInside(this, src);
        }
        this._data = src; // FIXME: should we rely only on isModified instead of this._data ?
        this.setModified(true);
        this.set(false);
      }  
    },             

    // Parses model content and serializes it as XML directly into the logger
    onSave : function (logger) {
      var src = _getImageSrcFromHandle(this),
          html = (this.getParam('image_lang') === 'html'),
          tagname = this.getParam('image-tag') || 'Source', h, img;
      if (html) {
        logger.openTag('img');
        tagname = 'src';
      }                   
      // FIXME: ne pas serializer si valeur par défaut (pas image)
      logger.openAttribute(tagname);
      logger.write(src);
      logger.closeAttribute(tagname); 
      if (this.image_resizable) {         
        h = this.getHandle();
        img = $('img', h);
        if (img) {
          logger.openAttribute('width');
          logger.write($(img).width());
          logger.closeAttribute('width'); 
          logger.openAttribute('height');
          logger.write($(img).height());
          logger.closeAttribute('height');
        }
      }
      if (html) {
        logger.closeTag('img');
      }
    },
    
    methods : {
      
      getData : function () {
        return _getImageSrcFromHandle(this);
      },
      
      // Manages two cases: 
      // 1. if aData is an image file name then generates an <img> tag 
      // 2. if aData is a string then forwards call to default _setData
      _setData : function (aData) {    
        if (aData.search && (aData.search(/(png|jpg|jpeg|gif)$/i) !== -1)) { 
          _genImageInside(this, aData);
          this._data = aData;
        } else {
          var h = this.getHandle(); 
          if (h.firstChild.nodeType !== xtdom.TEXT_NODE) {
            xtdom.removeChildrenOf(h);
            var t = xtdom.createTextNode(this.getDocument(), '');
            h.appendChild(t);
          }
          this.__image___setData(aData);
        }
      },
  
      // Tests if the input is not empty, nor the defaultContent (no editing)
      // nor a correct file name in which case it replaces the input with 
      // an error message. Forwards call to the default update.
      update : function (aData) {   
        if ((aData.search(/\S/) !== -1) // not empty
          && (aData !== this.getDefaultData())  // edited content (no default)
          && (aData.search(/(png|jpg|jpeg|gif)$/i) === -1)) { // incorrect file extension
            this.__image__update('Not a supported image file (must end with png, jpg, jpeg or gif)');
            // be careful not to finish the error message with a correct image file extension
        } else {
          this.__image__update(aData);
        }
      },    
    
      startEditing : function (aEvent) {
        var tracker;
        if (this.image_resizable) {
           tracker = _getDevice(this.getDocument(), this, true);
           if (tracker) {
             tracker.stopEditing(); // just in case 
           }
        }                        
        this.__image__startEditing(aEvent);
      },

      // Zoom in the image and it's handler by one unit
      zoomIn : function () {                
        var handle = this.getHandle(), 
            wrapper = $('img', handle), 
            w, h, rw, rh, z;                
        if (wrapper.size() > 0) { // sanity check
          w = wrapper.width();
          h = wrapper.height();
          rw = this.image_maxWidth ? this.image_maxWidth / w : undefined;
          rh = this.image_maxHeight ? this.image_maxHeight / h : undefined;
          z = rw ? ( rh ? ( rh > rw ? rw : rh ) : rw ) : rh;
          if (z) {               
            if (z > 1) {
              if (z > 1.1) {
                z = 1.1;
              } else {
                _getDevice(this.getDocument(), this, true).disable('zoomin');
              }
              wrapper.width(w * z).height(h * z);
              $(handle).width(w * z).height(h * z);
              _getDevice(this.getDocument(), this, true).enable('zoomout');
            } else {
              _getDevice(this.getDocument(), this, true).disable('zoomin');
            }
          }
        }
      },

      // Zoom out the image and it's handler by one unit
      zoomOut : function () {
        var handle = this.getHandle(), 
            wrapper = $('img', handle), 
            w, h, rw, rh, z;                
        if (wrapper.size() > 0) { // sanity check
          w = wrapper.width();
          h = wrapper.height();
          rw = this.image_minWidth ? this.image_minWidth / w : undefined;
          rh = this.image_minHeight ? this.image_minHeight / h : undefined;
          z = rw ? ( rh ? ( rh > rw ? rh : rw ) : rw ) : rh;
          if (z) {               
            if (z < 1) {
              if (z < 0.9) {
                z = 0.9;
              } else {
                _getDevice(this.getDocument(), this, true).disable('zoomout');
              }
              wrapper.width(w * z).height(h * z);
              $(handle).width(w * z).height(h * z); 
              _getDevice(this.getDocument(), this, true).enable('zoomin');            
            } else {
              _getDevice(this.getDocument(), this, true).disable('zoomout');
            }
          }
        }
      }
    }
  }; 
   
  $axel.filter.register(
    'image',
    { chain : ['onAwake', 'onLoad', 'update', '_setData', 'startEditing'] },
    {
      image_tag : 'Source',
      image_lang : 'default', 
      base : undefined,
      image_maxWidth : undefined,
      image_maxHeight : undefined,
      image_minWidth : undefined,
      image_minHeigth : undefined
    },
    imageFilterMixin
  );
  $axel.filter.applyTo({'image' : 'text'});
}($axel));


// file: axel/src/filters/wiki.js
/* ***** BEGIN LICENSE BLOCK *****
 *
 * @COPYRIGHT@
 *
 * This file is part of the Adaptable XML Editing Library (AXEL), version @VERSION@ 
 *
 * @LICENSE@
 *
 * Web site : https://github.com/ssire/axel
 * 
 * Author(s) : Stephane Sire
 * 
 * ***** END LICENSE BLOCK ***** */

/*****************************************************************************\
|                                                                             |
|  AXEL 'wiki' filter                                                         |
|                                                                             |
|  Wiki filters produces and loads 3 types of XML markup depending on the     |
|  value of the "wiki_lang" parameter of the plugin :                         |
|                                                                             |
|  - 'html' serializes to a forrest of mixed content with text(), <strong>,   |
|    <em> and <a>                                                             |
|  - 'span' serializes to a forrest of <span>,                                |
|     <span class="verbatim|important"> and <a>                               |
|  - 'default' serializes to a forrest of <Fragment>,                         |
|    <Fragment FragmentKind="verbatim|important"> and <Link>                  |
|                                                                             |
|  An unspecified value is equivalent to 'default'                            |
|  The handle content is the same as the serialized content in 'html' and     | 
| 'span' mode; in default mode the handle content is the same as the 'html'   |
|  mode.                                                                      |
|                                                                             |
|*****************************************************************************|
|  Compatibility: 'text' plugin                                               |
|                                                                             |
\*****************************************************************************/

// FIXME: filter init function to create a wiki_lang property in the host model
// which is set to 'html' or 'default' but no other value !
(function ($axel) {
 
 var _markers_re = "\\*|'|_";

 // FIXME: the URL scanner could be improved, at the moment it accepts '&' and ';' because
 // characters entities are replaced before scanning and http://url&param=stg[link] 
 // will be parsed as http://url&amp;param=stg[link] 
 var _scanner = new RegExp(
    "(http:\/\/[\\.\\w\/\\-\\?\\=_&;#]*)\\[([^\\]]*)\\]" 
    + "|(" + _markers_re + "){2}(.*?)\\3{2}"
    + "|(#[\\.\\w\/\\-_]*)\\[([^\\]]*)\\]"
    + "|==(.*?)==\\((.*?)\\)", "g");

 var _schemeonly = new RegExp("^(mailto|http|https):?(//)?", "i");

 var _server = new RegExp("^(\\w+\\.)+[a-z]+(.*?)$", "i");

 // drives conversion from Fragment with FragmentKind attribute to handle ('default' mode)
 var _kind2tag = {
   'important' : 'strong',
   'emphasize' : 'em',
   'verbatim' : 'tt'   
 };

 // drives conversion from handle to XML ('default' mode)
 // UPPERCASE version for IE
 var _tag2kind = {
   "strong" : 'important',
   'em' : 'emphasize',
   "tt" : 'verbatim',
   "STRONG" : 'important', // IE version
   "EM" : 'verbatim',    
   "TT" : 'verbatim'
 };

 // drives conversion from Wiki ASCII text to handle ('html' and 'default' mode)
 var _wiki2tag = {
   "*" : 'strong', 
   "_" : 'em',
   "'" : 'tt'
 };

 // drives conversion from Wiki ASCII text to handle ('span' mode)
 var _wiki2class = {
   "*" : 'important', 
   "_" : 'emphasize',
   "'" : 'verbatim'
 };

 // drives conversion from handle to WIKI ASCII text ('html' and 'default' mode)
 // UPPERCASE version for IE
 var _tag2wiki = {
   "strong" : '**',
   "em" : '__',
   "tt" : "''",
   "STRONG" : '**',
   "EM" : "__",
   "TT" : "''"   
 };

 // drives conversion from handle to WIKI ASCII text ('span' mode)
 var _class2wiki = {
   "important" : '**',
   "emphasize" : '__',
   "verbatim" : "''"
 };

 // rewrites a local URL 
 var _rewriteURL = function _rewriteURL (href) {
   // TBD using wiki_rel_baseurl / wiki_rel_baseurl
   return href;
 };

 var _genLink = function _genLink (href, anchor) {
   var fullhref, hinput, hrewritten, tmp1, tmp2;
   var m = _schemeonly.exec(href);
   if (m) {
    if (m[0].length == href.length) { // scheme only (mailto, http, etc.)
      if (m[1].toLowerCase() == 'mailto') {
        fullhref = href + ((href.indexOf(':') != -1) ? '' : ':') + anchor;
      } else {
        fullhref = href + ((href.indexOf(':') != -1) ? '//' : '://') + anchor;
      }
      hinput = m[1]; // simplification
    } else { // complete URL (mailto:..., http://...)
      fullhref = href;
    }
   } else if (href.charAt(0) == '/') { // absolute URL (/static/docs/rapport.pdf)
    fullhref = _rewriteURL(href);
    hrewritten = true;
    hinput = href;
   } else if (href.indexOf('@') != -1) { // email with no scheme (sire@oppidoc.fr)
    fullhref = 'mailto:' + href;
    hinput = href;
   } else if (_server.test(href)) { // external URL with no scheme
    fullhref = 'http://' + href;
    hinput = href;
   } else { // relative URL (accueil)
    fullhref = _rewriteURL(href);
    hrewritten = true;
    hinput = href;
   }
   tmp1 = hinput ? "data-input ='" + hinput + "' " : '';
   tmp2 = hrewritten ? "data-rewritten ='1' " : '';
   return "<a href='" + fullhref + "' " + tmp1 + tmp2 + "target='_blank'>" + anchor + "</a>";
 };

 /**
  * Scanner function to convert wiki-formatted text to html. Design to
  * be used as a callback in the String.replace() function.
  */
 var _text2html = function _text2html (str, href, anchor, marker, marked, mref, manchor, vanchor, vref, variant) {
   var tag, cl, ref, text;
   if (href) {
    return _genLink(href, anchor)
   } else if (mref) {
    return _genLink(mref, manchor)
   } else if (vref) {
    return _genLink(vref, vanchor)
   } else if (marker) {
    if (variant !== 'span') {
      tag = _wiki2tag[marker];
      return "<" + tag + ">" + marked + "</" + tag + ">";
    } else {
      cl = _wiki2class[marker];
      return '<span class="' + cl + '">' + marked + '</span>';
    }
   }
 };

 var _text2html_gen = function (variant) {           
   return function (str, href, anchor, marker, marked, mref, manchor, vanchor, vref) {
       return _text2html(str, href, anchor, marker, marked, mref, manchor, vanchor, vref, variant);      
   }
 };

 // Returns in an array only the element node children of n
 var _getElementChildren = function _getElementChildren (aNode) {
   var res = [];
   var c = aNode.childNodes;
   var i, cur;
   for ( i = 0; i < c.length; i++) {
     cur = c.item(i);
     if (cur.nodeType == xtdom.ELEMENT_NODE) {
       res.push(cur);
     }
   }
   return res;
 };         

 var _dumpText = function _dumpText (aContainer, aTextStr, aDocument) {   
   if (aTextStr && (aTextStr.search(/\S/) != -1)) {
     if (aContainer.lastChild && (aContainer.lastChild.nodeType === xtdom.TEXT_NODE)) {
       aContainer.lastChild.appendData(aTextStr); // completes the existing text
     } else {
       aContainer.appendChild(xtdom.createTextNode(aDocument, aTextStr));
     }
   }
 };

 // Dumps a "Fragment" to the handle
 // The "Fragment" depends of the filter's wiki language (html, span or default)
 var _dumpFragment = function _dumpFragment (aBuffer, aFragment, aDocument, lang) {  
   var cur, key, tag, content,
       parent = aBuffer;
   if (lang === 'default') {
     key = aFragment.getAttribute('FragmentKind'),
     tag = key ? _kind2tag[key] : undefined;
   } else {
     tag = xtdom.getLocalName(aFragment);
   }
   content = aFragment.firstChild ? aFragment.firstChild.nodeValue : undefined;
   if (tag) {
     cur = xtdom.createElement(aDocument, tag);
     parent.appendChild(cur);
     parent = cur;
     if ((lang === 'span') && xtdom.hasAttribute(aFragment, 'class')) {
       xtdom.addClassName(cur, aFragment.getAttribute('class'));
     }
   }
   _dumpText(parent, content, aDocument); 
 };

 // Dumps a <Link> or a <a> element as a <a> element
 var _dumpLink = function _dumpLink (aBuffer, aLink, aDocument, lang) {
   var linktextnode, url, datainput;
   if (lang !== 'default') {
     linktextnode = aLink;
     url = aLink.getAttribute('href');
     datainput = xtdom.hasAttribute(aLink, 'data-input') ? aLink.getAttribute('data-input') : null;
   } else {
     var c = _getElementChildren(aLink); // LinkText & LinkRef
     var name = xtdom.getLocalName(c[0]);
     var itext = 0, iref = 0;
     if (name === 'LinkText') { 
       iref = 1; // LinkRef is in second position
     } else {
       itext = 1; // LinkText is in second position
     } 
     linktextnode = c[itext];
     url = c[iref].firstChild ? c[iref].firstChild.nodeValue : '...';
     datainput = xtdom.hasAttribute(c[iref], 'data-input') ? c[iref].getAttribute('data-input') : null;
   }
   var a = xtdom.createElement(aDocument, 'a');
   var content = linktextnode.firstChild ? linktextnode.firstChild.nodeValue : '...'; 
   var anchor = xtdom.createTextNode(aDocument, content);
   a.appendChild(anchor);
   a.setAttribute('href', url);
   if (datainput) {
     a.setAttribute('data-input', datainput);
   }
   // FIXME: detect local relative or absolute URLs and call _rewriteURL
   aBuffer.appendChild(a);
 };

 // Dumps XML data to the handle for display
 var _dumpContent = function _dumpContent (aBuffer, aContent, aDocument, lang) {
   var key, content,
       cur = aContent.firstChild;
   while (cur) {
     if (cur.nodeType === xtdom.ELEMENT_NODE) {
       key = xtdom.getLocalName(cur);
       if ((key === 'Link') || (key === 'a') || (key === 'A')) {
         _dumpLink(aBuffer, cur, aDocument, lang);
       } else {       
         _dumpFragment(aBuffer, cur, aDocument, lang);
       }
     } else if (lang === 'html') { // accepts mixed content
       if (cur ===  aContent.firstChild) { // trims left 
         content = cur.nodeValue.replace(/^\s+/g,'');
       } else if (cur.nextSibling) { // does not trim
         content = cur.nodeValue;          
       } else { // trims right 
         content = cur.nodeValue.replace(/\s+$/g,'');
       }
       _dumpText(aBuffer, content, aDocument);
     }
     cur = cur.nextSibling;
   }
 };

 var _getPopupDevice = function _getPopupDevice (aDocument) {
   var devKey = 'popupdevice';
   var device = xtiger.session(aDocument).load(devKey);
   if (! device) {  // lazy creation
     device = new xtiger.editor.PopupDevice (aDocument); // hard-coded device for this model
     xtiger.session(aDocument).save(devKey, device);
   }
   return device;
 };     

 var _enspanHandle = function _enspanHandle(aNode, aDocument) {
   var _tmp, _next;
   var _cur = aNode.firstChild; 
   while (_cur) {
     _next = _cur.nextSibling;
     if (_cur.nodeType == xtdom.TEXT_NODE) {   
       _tmp = xtdom.createElement(aDocument, 'span');
       aNode.replaceChild(_tmp, _cur);
       _tmp.appendChild(_cur);
     }
     _cur = _next;
   }
 };

 var _WikiFilter = { 

    // Loads XML data from the point into the editor. Converts it to an XHTML representation.
    // DOES forward the call only if data source is empty.
    onLoad: function load (aPoint, aDataSrc) {
      // FIXME: manage spaces in source
      if (aDataSrc.isEmpty(aPoint)) {
        this.__wiki__onLoad(aPoint, aDataSrc); // no content : default behavior
      } else {
        var h = this.getHandle();
        xtdom.removeChildrenOf(h);      
        // var cur = xtdom.createTextNode(this.getDocument(), '');
        // h.appendChild(cur);
        _dumpContent (h, aPoint[0], this.getDocument(), this.getParam('wiki_lang') || 'default');
        this.setModified(true);
        this.set(false);
      }
    },
    
    // Parses current editor content and serializes it as XML directly into the logger.
    // DOES NOT forward the call.
    onSave: function save (aLogger) {
      var lang; 
      if (this.isOptional() && !this._isOptionSet) {
        aLogger.discardNodeIfEmpty();
        return;
      }         
      lang = this.getParam('wiki_lang') || 'default';
      if (lang === 'html') {
        aLogger.allowMixedContent();        
      }
      return (lang === 'default') ? this._saveHandleAsFragment(aLogger) : this._saveHandleAsIs(aLogger);
    },
    
    methods : {

      // Replaces the default _setData by a similar function that interprets data as wiki language.
      _setData: function _setData (aData) {
        var variant = this.getParam('wiki_lang') || 'default';
        try {
          // FIXME: sanitize to avoid Javascript injection ! 
          // text2html will encode entities (so it can match & in URLs) 
          this.getHandle().innerHTML = xtiger.util.encodeEntities(aData).replace(_scanner, _text2html_gen(variant));
          if (variant == 'span') {
            _enspanHandle(this.getHandle(), this.getDocument());
          }
        } catch (e) {         
          xtiger.cross.log('error', "Exception " + e.name + "\n" + e.message);
          try {
            this.getHandle().innerHTML = xtiger.util.encodeEntities(aData) + " (Exception : " + e.name + " - " + e.message + ")";
          } catch (e) {
            // nop          
          }
        }
      },
     
      // Saves the handle content
      _saveHandleAsIs : function (aLogger) {
        var name, anchor, href, tag, _class;
        var cur = this.getHandle().firstChild;
        while (cur) {
          if (cur.nodeType == xtdom.ELEMENT_NODE) {
            if (cur.firstChild) { // sanity check  
              name = xtdom.getLocalName(cur);
              aLogger.openTag(name);
              if ((name == 'a') || (name == 'A')) {
                if (cur.getAttribute('data-rewritten')) {
                  href = cur.getAttribute('data-input') || '...';
                } else {
                  href = cur.getAttribute('href') || '...';
                }
                aLogger.openAttribute('href');
                aLogger.write(href);
                aLogger.closeAttribute('href');
              }
              if (xtdom.hasAttribute(cur, 'data-input') && !(xtdom.hasAttribute(cur, 'data-rewritten'))) {
                aLogger.openAttribute('data-input');
                aLogger.write(cur.getAttribute('data-input'));
                aLogger.closeAttribute('data-input');
              }
              if (xtdom.hasAttribute(cur, 'class')) {
                aLogger.openAttribute('class');
                aLogger.write(cur.getAttribute('class'));
                aLogger.closeAttribute('class');
              }
              aLogger.write(cur.firstChild.data);
              aLogger.closeTag(name);
            }
          } else { // it's a text node per construction
            if (cur.data && (cur.data.search(/\S/) != -1)) { 
              aLogger.write(cur.data);
            }
          }
          cur = cur.nextSibling;
        }      
      }, 
    
      // Saves the handle content, converting it to Fragment syntax ('default' mode)
      _saveHandleAsFragment : function (aLogger, lang) {
        var name, anchor, href, tag;
        var cur = this.getHandle().firstChild;
        while (cur) {
          // FIXME: maybe we shouldn't save if cur.data / cur.firstChild.data is null ?
          if (cur.nodeType == xtdom.ELEMENT_NODE) {
            name = xtdom.getLocalName(cur);
            tag = _tag2kind[name];
            if (tag) {
              if (cur.firstChild) { // sanity check  
                aLogger.openTag('Fragment');
                aLogger.openAttribute('FragmentKind');
                aLogger.write(tag);
                aLogger.closeAttribute('FragmentKind');
                aLogger.write(cur.firstChild.data);
                aLogger.closeTag('Fragment');
              }
            } else if ((name == 'a') || (name == 'A')) {
              anchor = (cur.firstChild) ? cur.firstChild.data : '...';
              if (xtdom.hasAttribute(cur, 'data-rewritten')) {
                href = cur.getAttribute('data-input') || '...';
              } else {
                href = cur.getAttribute('href') || '...';
              }
              aLogger.openTag('Link');
              if (lang == 'html') {
                aLogger.write(anchor);
                aLogger.openAttribute('href');
                aLogger.write(href);
                aLogger.closeAttribute('href');
              } else {
                aLogger.openTag('LinkText');
                aLogger.write(anchor);
                aLogger.closeTag('LinkText');
                aLogger.openTag('LinkRef');
                if (xtdom.hasAttribute(cur, 'data-input') && !(xtdom.hasAttribute(cur, 'data-rewritten'))) {
                  aLogger.openAttribute('data-input');
                  aLogger.write(cur.getAttribute('data-input'));
                  aLogger.closeAttribute('data-input');
                }
                aLogger.write(href);
                aLogger.closeTag('LinkRef');
              }
              aLogger.closeTag('Link');
            } else {  
              aLogger.openTag(name);
              aLogger.write(cur.firstChild.data);
              aLogger.closeTag(name);
            }
          } else { // it's a text node per construction
            if (cur.data && (cur.data.search(/\S/) != -1)) { 
              aLogger.openTag('Fragment');
              aLogger.write(cur.data);
              aLogger.closeTag('Fragment');
            }
          }
          cur = cur.nextSibling;
        }
      },
    
      // Converts the content of the handle (e.g. #text, <span>, <a>, ...)
      // into ASCII text. DOES NOT forward the call.
      // Returns Wiki-formatted text to edit
      getData : function getData () {
        //FIXME: could be optimized by directly generating message into edit field
        var _key, _wikiSym, _tmp;
        var _txtBuffer = '';
        var _cur = this.getHandle().firstChild;
        while (_cur) {
          if (_cur.nodeType == xtdom.ELEMENT_NODE) {    
            if (this.getParam('wiki_lang') === 'span') {
              _key = _cur.getAttribute('class');
              _wikiSym = _key ? _class2wiki[_key] : undefined;
              _key = xtdom.getLocalName(_cur);            
            } else {            
              _key = xtdom.getLocalName(_cur);
              _wikiSym = _tag2wiki[_key]; 
            }      
            if ((_key === 'a') || (_key === 'A')) { 
              // _txtBuffer += (_cur.getAttribute('href') || '') + '[' + (_cur.firstChild ? _cur.firstChild.data : 'null') + ']';
              _tmp = _cur.getAttribute('data-input') || _cur.getAttribute('href') || '...';
              _txtBuffer += '==' + (_cur.firstChild ? _cur.firstChild.data : '...') + '==(' + _tmp + ')';
            } else if (_cur.firstChild) { // sanity check
              if (_wikiSym === undefined) {
                _txtBuffer += _cur.firstChild.data;
              } else {
                _txtBuffer += _wikiSym + _cur.firstChild.data + _wikiSym;
              }
            }          
          } else { // it's a text node per construction
            _txtBuffer += _cur.data;
          }
          _cur = _cur.nextSibling;
        }
        return _txtBuffer; // accepts delegation
      },    

      // Starts an edition process. Delays the start of the edition process in case 
      // the user clicked on a link inside the content, in which case it displays 
      // a popup menu to select between editing or opening the link in a new window.
      // DOES NOT forward the call if it is called from a mouse event and the user 
      // clicked on a link. DOES forward it otherwise.
      startEditing : function startEditing (optMouseEvent) {
        var _target, _tname;
        if (optMouseEvent) {
          _target = xtdom.getEventTarget(optMouseEvent);
          _tname = xtdom.getLocalName(_target);
          if (_tname.toUpperCase() === 'A') { // clicked on a link
            xtdom.preventDefault(optMouseEvent);
            xtdom.stopPropagation(optMouseEvent); // prevents link opening
            var _popupdevice = _getPopupDevice(this.getDocument());
            this._url = _target.getAttribute('href'); // stores the url to follow
            if ((!this._url) || (this._url == '')) {
              this._url = _target.getAttribute('HREF');
            }
            _popupdevice.startEditing(this, ['edit', 'open'], 'edit', _target);
            return;
          }
        }
        this.__wiki__startEditing(optMouseEvent);
      },

      // Callback for the popup device used to manage link edition
      onMenuSelection: function onMenuSelection (aSelection) {
        if (aSelection == 'edit') {
          this.__wiki__startEditing();
        } else if (aSelection == 'open') {
          // opens this.cachedURL in an external window
          window.open(this._url);
        }
      },

      // Accessor to change the selection state (kept for compatibility with popupdevice)
      setSelectionState: function setSelectionState (aState) {
        return aState ? this.set(): this.unset();
      }
    }
  };

  $axel.filter.register('wiki', 
    { chain: ['onLoad', 'startEditing'] },
    {},
    _WikiFilter);
  $axel.filter.applyTo({'wiki' : 'text'});
}($axel));

// file: axel/src/filters/date.js
/* ***** BEGIN LICENSE BLOCK *****
 *
 * @COPYRIGHT@
 *
 * This file is part of the Adaptable XML Editing Library (AXEL), version @VERSION@ 
 *
 * @LICENSE@
 *
 * Web site : http://media.epfl.ch/Templates/
 * 
 * Author(s) : Stephane Sire (Oppidoc)
 * 
 * ***** END LICENSE BLOCK ***** */
 
/*****************************************************************************\
|                                                                             |
|  AXEL 'date' filter                                                         |
|                                                                             |
|  Replaces handle with a jQuery UI calendar field when editing               |
|                                                                             |
|*****************************************************************************|
|  Prerequisites : JQuery and JQuery UI datepicker                            |
|  Note : this filter cannot be chained with other filters                    |
|                                                                             |
\*****************************************************************************/
(function ($axel) {
 
 // FIXME: move to bundles ?
 var REGION = { 
     'fr': {
           closeText: 'Fermer',
           prevText: 'Précédent',
           nextText: 'Suivant',
           currentText: 'Aujourd\'hui',
           monthNames: ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'],
           monthNamesShort: ['Janv.','Févr.','Mars','Avril','Mai','Juin','Juil.','Août','Sept.','Oct.','Nov.','Déc.'],
           dayNames: ['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'],
           dayNamesShort: ['Dim.','Lun.','Mar.','Mer.','Jeu.','Ven.','Sam.'],
           dayNamesMin: ['D','L','M','M','J','V','S'],
           weekHeader: 'Sem.',
           dateFormat: 'dd/mm/yy',
           firstDay: 1,
           isRTL: false,
           showMonthAfterYear: false,
           yearSuffix: ''
         }
 };

 // converts a date string between two different formats
 // leave it unchanged in case of errot
 // FIXME: some formats such as RSS also requires to pass Day and Month name options !!!!
 var _convertDate = function ( editor, dateStr, inSpec, outSpec ) {
   var inFormat = editor.getParam(inSpec);
   var outFormat = editor.getParam(outSpec);
   if (inSpec === 'date_region') { // double indirection
     inFormat = REGION[inFormat] ? REGION[inFormat].dateFormat : $.datepicker.regional[''].dateFormat;
     outFormat = $.datepicker[outFormat];
   }
   if (outSpec === 'date_region') { // double indirection
     inFormat = $.datepicker[inFormat];
     outFormat = REGION[outFormat] ? REGION[outFormat].dateFormat : $.datepicker.regional[''].dateFormat;
   }
   var res = null;
   try {
     res = $.datepicker.formatDate(outFormat,$.datepicker.parseDate(inFormat, dateStr));
   }
   catch (e) {
     res = dateStr;
   }
   return res;
 };
 
 /*****************************************************************************\
 |                                                                             |
 | jQuery date picker device                                                   |
 |                                                                             |
 | FIXME:  - move to separate file                                             |
 \*****************************************************************************/
 var datepickerDevice = function ( doc ) {
   var _this = this;
   this.handle = xtdom.createElement(doc, 'input');
   xtdom.setAttribute(this.handle, 'id', 'xt-date-datepicker');
   xtdom.setAttribute(this.handle, 'size', 10);
   $('body', doc).append(this.handle);
   this.jhandle = $('body > #xt-date-datepicker', doc);
   this.jhandle.datepicker().datepicker('option', 'onClose', function () { _this.onClose(); });
   this.myDoc = doc;
   this.cache = {};
 };

 datepickerDevice.prototype = {
   // Replaces the editor's handle with the date picker input
   // Somehow similar to PlacedField in text device
   // Replaces the handle with a hook that has the same root element as the handle
   // and that contains an input or textarea edit field
   // FIXME: register keyboard manager to track TAB navigation ?
   grab : function ( editor, doSelectAll ) {
     var tmp, _htag, region = editor.getParam('date_region');
     $.datepicker.setDefaults((region === 'fr') ? REGION['fr'] : $.datepicker.regional['']);
     this.jhandle.val(editor.getData()); // FIXME: format data to date (?)
     this.editorHandle = editor.getHandle();
     this.model = editor;
     _htag = xtdom.getLocalName(this.editorHandle); 
     if (! this.cache[_htag]) {
       this.hook = xtdom.createElement(this.myDoc, _htag);
       this.cache[_htag] = this.hook;
     } else {
       this.hook = this.cache[_htag];
     }
     // constraints
     tmp = editor.getParam('minDate');
     this.jhandle.datepicker('option', 'minDate', tmp || null);
     tmp = editor.getParam('maxDate');
     this.jhandle.datepicker('option', 'maxDate', tmp || null);
     tmp = editor.getParam('beforeShow');
     if (tmp) {
       this.jhandle.datepicker('option', 'beforeShow', tmp); // sets callback
     } else {
       this.jhandle.datepicker('option', 'beforeShow', tmp); // unsets callback
     }
     // insertion
     var parent = this.editorHandle.parentNode;  
     if (this.hook.firstChild != this.handle) {
       this.hook.appendChild(this.handle);
     }
     parent.insertBefore (this.hook, this.editorHandle, true);
     parent.removeChild(this.editorHandle);
     if (doSelectAll) {
       xtdom.focusAndSelect(this.handle);
     } else {
       this.jhandle.datepicker('show');
     }
     this.closingInProgress = false;
   },
   release : function ( isCancel ) {
     var parent = this.hook.parentNode;
     parent.insertBefore (this.editorHandle, this.hook, true);
     parent.removeChild(this.hook);
     if (! isCancel) {
       this.model.update(this.jhandle.val()); // updates model with new value
     }
     if (! this.closingInProgress) { // external call (e.g. TAB navigation ?)
       this.closingInProgress = true;
       this.jhandle.datepicker('hide');
     }
   },
   onClose : function ( ) {
     if (! this.closingInProgress) {
       this.release();
     }
   }
 };

 xtiger.registry.registerFactory('datepickerdev', 
   {
     getInstance : function (doc) {
       var cache = xtiger.session(doc).load('datepickerdev');
       if (! cache) {
         cache = new datepickerDevice(doc);
         xtiger.session(doc).save('datepickerdev', cache);
       }
       return cache;
     }
   }
 );

 var datepickerFilterMixin = {
   
   onLoad : function (aPoint, aDataSrc) {
     this.__date__onLoad(aPoint, aDataSrc);
     // post-action : converts view data to date_region format
     this._setData(_convertDate(this, this._data, 'date_format', 'date_region'));
   },

   onSave : function (aLogger) {
     var tmp = this._data;
     // pre-action : converts view data model to date_format
     this._data = _convertDate(this, tmp, 'date_region', 'date_format');
     this.__date__onSave(aLogger);
     this._data = tmp; // reestablish it for next save
   },

   methods : {

     startEditing : function ( aEvent ) {
       var _doSelect = !this.isModified() || (aEvent && aEvent.shiftKey);
       var picker = xtiger.factory('datepickerdev').getInstance(this.getDocument());
       picker.grab(this, _doSelect);
     },

     stopEditing : function ( isCancel ) {
       var picker = xtiger.factory('datepickerdev').getInstance(this.getDocument());
       picker.release(isCancel);
     },
   
     // Experimental method to change parameters - to be part of future Param API ?
     // FIXME: indirection for datepicker('option', key, value) ?
     configure : function (key, value) {
       if ((value === undefined) || (((key === 'minDate') || (key === 'maxDate')) && isNaN(new Date(value).getDay()))) { 
         delete this._param[key];
       } else {
         this._param[key] = value;
         // FIXME: this.configure(key, value)
       }
     }
   }
 };
 
 $axel.filter.register(
    'date', 
    { chain : [ 'onLoad', 'onSave' ] },
    { 
      date_region : 'fr',
      date_format : 'ISO_8601'
    },
    datepickerFilterMixin);
 $axel.filter.applyTo({ 'date' : 'text' });
}($axel));

// file: axel/src/filters/style.js
/* ***** BEGIN LICENSE BLOCK *****
 *
 * @COPYRIGHT@
 *
 * This file is part of the Adaptable XML Editing Library (AXEL), version @VERSION@
 *
 * @LICENSE@
 *
 * Web site : https://github.com/ssire/axel
 *
 * Author(s) : Stephane Sire
 *
 * ***** END LICENSE BLOCK ***** */

/*****************************************************************************\
|                                                                             |
|  AXEL 'width' filter                                                        |
|                                                                             |
|  Turns a field into a "live" width field (in pixels) applying it's current  |
|  value onto a DOM target                                                    |
|                                                                             |
|*****************************************************************************|
|                                                                             |
|  Prerequisite: jQuery                                                       |
|  Compatibility: 'text' plugin                                               |
|                                                                             |
\*****************************************************************************/
(function ($axel) {

  function _getTarget (me) {
    var rootcn = me.getParam('width_root_class'),
        targetcn = me.getParam('width_target_class'),
        root = $(me.getHandle(true)).closest('.' + rootcn),
        res = targetcn ? root.find('.' + targetcn).first() : root;
    if (! res) {
     xtiger.cross.log('warning', "'width' filter could not find target node");
    }
    return res;
  }

  var _Filter = {

    methods : {

      set : function(doPropagate) {
        var val, target = _getTarget(this);
        if (target) {
          val = this.getData();
          if (/^\d+$/.test(val)) {
            val = val + 'px';
          } else {
            val="auto";
          }
          target.css('width', val);
        }
        this.__width__set(doPropagate);
      },

      clear : function (doPropagate) {
        var target = _getTarget(this);
        if (target) {
          target.css('width', '');
        }
        this.____width__clear(doPropagate);
      }

      // unset : function (doPropagate) {
      // }
      // FIXME: there is one case where unset is called and not clear (unchek through checkbox)
    }
  };

  $axel.filter.register(
    'width',
    { chain : [ 'set', 'clear'] },
    null,
    _Filter);
  $axel.filter.applyTo({'width' : 'text'});
}($axel));

/*****************************************************************************\
|                                                                             |
|  AXEL 'style' filter                                                        |
|                                                                             |
|  Filter that works ONLY for an optional text editor (option="...") :        |
|  adds the 'optclass_name' class name to the parent of the handle            |
|  when the handle is selected                                                |
|                                                                             |
|*****************************************************************************|
|                                                                             |
|  Prerequisite: jQuery                                                       |
|  Compatibility: 'text', 'select' plugins                                    |
|                                                                             |
\*****************************************************************************/
(function ($axel) {

  function _getTarget ( me, dontComplain ) {
    var rootcn = me.getParam('style_root_class'),
        targetcn = me.getParam('style_target_class'),
        root = rootcn ? $(me.getHandle(true)).closest('.' + rootcn) : null,
        res = (root && targetcn) ? root.find('.' + targetcn).first() : root;
    if ((! res) && (! dontComplain)) {
      xtiger.cross.log('warning', "'style' filter could not find target node");
    }
    return res;
  }

  var _Filter = {

    // the default value MUST match the default CSS settings
    // FIXME: enforce it ?
     onInit : function ( aDefaultData, anOptionAttr, aRepeater ) {
       var expr;
       this.__style__onInit(aDefaultData, anOptionAttr, aRepeater);
       expr = this.getParam('style_value');
       if (expr) {
         this._CurStyleValue = expr.replace(/\$_/g, aDefaultData);
       } else {
         this._CurStyleValue = aDefaultData;
      }
       // works with 'select' iff aDefaultData is the target XML value (not the i18n one)
     },

     methods : {

       // TBD
       // update : function () {
       //   if (this.getParam('style_unit')) {
       //      vérifier que c'est un nombre et afficher erreur sinon (utiliser style_error_target ou data_validation_error pour afficher ?)
       //   }
       // },

       set : function ( doPropagate ) {
         var value, prop, values, target, expr, doc, rule, unit = this.getParam('style_unit');
         this.__style__set(doPropagate);
         // CSS rule mode
         expr = this.getParam('style_rule_selector');
         if (expr) {
           rule = expr + ' {' + this.getParam('style_property') + ':' + this.getData() + (unit ? unit + '}' : '}');
         }
         expr = this.getParam('style_rule');
         if (expr) {
           rule = expr.replace(/\$_/g, this.getData());
         }
         if (rule) {
           doc = this.getDocument();
           if (! this._StyleRuleHandle) {
             this._StyleRuleHandle = $("<style type='text/css'> </style>", doc).appendTo($("head", doc));
           }
           this._StyleRuleHandle.text(rule);
         }
         // direct target mode
         target = _getTarget(this,  rule !== undefined);
         if (target) {
           prop = this.getParam('style_property') || 'class';
           values = this.getParam('values');
           if (values) { // this is a 'select' plugin (FIXME: api this.getPluginType())
             value = this.getData();
             if (this._CurStyleValue) {
               if (prop === 'class') {
                 target.removeClass(this._CurStyleValue);
               }
             }
             this._CurStyleValue = value;
           } else { // not a 'select' plugin
             value = this.getParam('style_value') || this.getData();
           }
           expr = this.getParam('style_value');
           if (expr) {
             value = expr.replace(/\$_/g, value);
             if (this._CurStyleValue) {
               this._CurStyleValue = value; // rewrite it too
             }
           }
           if (prop === 'class') {
              target.addClass(value)
           } else {
              target.css(prop, unit ? value + unit : value);
           }
         }
       },

       unset : function ( doPropagate ) {
         var value, prop, target, expr, doc;
         this.__style__unset(doPropagate);
         prop = this.getParam('style_property') || 'class';
         // CSS rule mode
         expr = this.getParam('style_rule_selector') || this.getParam('style_rule');
         if (expr && this._StyleRuleHandle) {
           this._StyleRuleHandle.text('');
         }
         // direct target mode
         target = _getTarget(this, expr);
         // xtiger.cross.log('debug', 'unset');
         if (target) {
           prop = this.getParam('style_property') || 'class';
           if (this.getParam('values')) { // this is a 'select' plugin
             value = this._CurStyleValue;
           } else {
             value = this.getParam('style_value') || this.getData();
             // xtiger.cross.log('debug', 'unset with value ' + value)
           }
           if (value) {
             (prop === 'class') ? target.removeClass(value) : target.css(prop, '');
             // FIXME: remember original css value in set and restore it ?
           }
         }
       }
    }
  };

  $axel.filter.register(
    'style',
    { chain : ['onInit', 'set', 'unset'] },
    null,
    _Filter);
  $axel.filter.applyTo({'style' : ['text', 'select']});
}($axel));

// file: axel/src/filters/video.js
/* ***** BEGIN LICENSE BLOCK *****
 *
 * @COPYRIGHT@
 *
 * This file is part of the Adaptable XML Editing Library (AXEL), version @VERSION@
 *
 * @LICENSE@
 *
 * Web site : https://github.com/ssire/axel
 *
 * Author(s) : Stephane Sire, Antoine Yersin
 *
 * ***** END LICENSE BLOCK ***** */

/*****************************************************************************\
|                                                                             |
|  AXEL 'video' filter                                                        |
|                                                                             |
|  This is an experimental filter that has been developped as a replacement   |
|  for the video.js plugin.                                                   |
|  It's design is simpler as the video URL is always visible on the screen    |
|  and edited through a text editor. It adds a :                              |
|  <br /><object>...</object><span class="axel-core-boundary"/> forrest       |
|  right after the text handle                                                |
|                                                                             |
|*****************************************************************************|
|  Compatiblity: 'text' plugin                                                |
|                                                                             |
\*****************************************************************************/

// FIXME: currently you must include video.js first as it shares its bundle with it (for the TV icon URL)
(function ($axel) {

  // Extracts You Tube video id from a valid link to the video
  // (either the "permalink" or the page's link)
  // Copied from 'video.js' plugin
  var _extractVideoId = function _extractVideoId (aValidUrl) {
    var _tmp = aValidUrl.match(/^[^&]*/)[0];
    return _tmp.match(/[^\=\/]*$/)[0];
  }

  // Copied from 'video.js' plugin
  var _buildYoutubeSnippet = function _buildYoutubeSnippet (aVideoID, aSize, aParams, targetDoc) {
    var _params = aParams || {};
    _params['movie'] = aVideoID;
    if (!_params['allowFullScreen'])
      _params['allowFullScreen'] = 'true';
    if (!_params['alloscriptaccess'])
      _params['alloscriptaccess'] = 'always';
    var _obj = xtdom.createElement(targetDoc, 'object');
    if (aSize) {
      _obj.height = aSize[0];
      _obj.width = aSize[1];
    } else {
      _obj.height = 344;
      _obj.width = 425;
    }
    _obj.style.zIndex = 1000;
    for (var _param in _params) {
      var _p = xtdom.createElement(targetDoc, 'param');
      _p.name = _param;
      _p.value = _params[_param];
      _obj.appendChild(_p);
    }
    var _embed = xtdom.createElement(targetDoc, 'embed');
    xtdom.setAttribute(_embed, 'src', aVideoID);
    xtdom.setAttribute(_embed, 'type', 'application/x-shockwave-flash');
    xtdom.setAttribute(_embed, 'allowfullscreen', 'true');
    xtdom.setAttribute(_embed, 'allowscriptaccess', 'always');
    xtdom.setAttribute(_embed, 'width', '425');
    xtdom.setAttribute(_embed, 'height', '344');
    _embed.style.zIndex = 1000;
    if (xtiger.cross.UA.IE) {
      _obj = _embed;
    } else {
      _obj.appendChild(_embed);
    }
    return _obj;
  }

  // Returns an [node, boolean] array where node is the <img> node or the <object>/<embed> node
  // that was added by the video filter to the DOM inside extension if it finds it, or undefined,
  // and boolean is true if it is a video player node (i.e. object/embed)
  // FIXME: we could also save this information directly inside the filtered editor model !
  var _getHandleExtension = function _getHandleExtension (that) {
    var h = that.getHandle(true);
    var hook = h.nextSibling ? h.nextSibling.nextSibling : undefined;
    var isVideo = false;
    if (hook) { // node exists
      var name = xtdom.getLocalName(hook); // checks that it belongs to video filter
      if ((name.toLowerCase() == 'object') || (name.toLowerCase() == 'embed')) {
        isVideo = true;
      } else if (name.toLowerCase() != 'img') {
        hook = undefined;
      }
    }
    return [hook, isVideo];
  }

  var _Filter = {

    // FIXME: missing 'repeater' argument to know if init is called from a repeater
    onInit : function ( aDefaultData, anOptionAttr, aRepeater ) {
      if (! aRepeater) {
        var h = this.getHandle();
        var br = xtdom.createElement(this.getDocument(), 'br');
        var img = xtdom.createElement(this.getDocument(), 'img');
        var guard = xtdom.createElement(this.getDocument(), 'span');
        xtdom.addClassName(guard, 'axel-core-boundary');
          // fixed boundary for AXEL marker
          // it will not be removed when chaging img to object and vice-versa
        img.src = xtiger.bundles.video.tvIconURL;
        var parent = h.parentNode;
        if (h.nextSibling) {
          parent.insertBefore (guard, h.nextSibling, true);
          parent.insertBefore (img, guard, true);
          parent.insertBefore (br, img, true);
        } else {
          parent.appendChild(br);
          parent.appendChild(img);
          parent.appendChild(guard);
        }
      } // otherwise repeater has cloned everything
      this.__video__onInit(aDefaultData, anOptionAttr, aRepeater);
      // call super init at the end because it triggers a call to _setData and eventually to set or unset
      // all of which require that the handle extension has been initialized first
    },

    methods : {

      _setData : function (text) {
        var extension = _getHandleExtension(this);
        // pas d'effet de bord sur Boolean
        var filtered = text;
        if (extension[0]) {
          if (text != this.getDefaultData()) {
            // var cur = this.getHandle().firstChild.data;
            var cur = this.getData();
            // FIXME: we could check that it's a valid URL or object first ?
            var _videoID = _extractVideoId(text);
            var data = 'http://www.youtube.com/v/' + _videoID;
            if (cur != data) {
              var _newContent = _buildYoutubeSnippet(data, null, null, this.getDocument());
              extension[0].parentNode.replaceChild(_newContent, extension[0]);
              filtered = data;
            }
          } else if (extension[1]) { // resets video icon if it wasn't
            var img = xtdom.createElement(this.getDocument(), 'img');
            img.src = xtiger.bundles.video.tvIconURL;
            extension[0].parentNode.replaceChild(img, extension[0]);
          }
        }
        this.__video___setData(filtered);
      },

      set : function (doPropagate) {
        this.__video__set(doPropagate);
        if (this.isOptional()) {
          var h = this.getHandle(true);
          if (h.nextSibling && h.nextSibling.nextSibling) {
            xtdom.replaceClassNameBy (h.nextSibling.nextSibling, 'axel-option-unset', 'axel-option-set');
          }
        }
      },

      unset : function (doPropagate) {
        this.__video__unset(doPropagate);
        if (this.isOptional()) {
          var h = this.getHandle(true);
          if (h.nextSibling && h.nextSibling.nextSibling) {
            xtdom.replaceClassNameBy (h.nextSibling.nextSibling, 'axel-option-set', 'axel-option-unset');
          }
        }
      }
    }
  }

  $axel.filter.register(
    'video',
    { chain : ['onInit', 'set', 'unset', '_setData'] },
    null,
    _Filter);
  $axel.filter.applyTo({'video' : 'text'});
}($axel));

