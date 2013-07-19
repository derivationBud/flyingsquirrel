from bottle import default_app, route
import sys
#sys.path.insert(0,"/home/derivationBud/clones/beaker")
#import beaker

if 0:
    from bottle import error
    @error(404)
    def error404(error):
        return("Sorry :(... That's a 404")

#----------------------------- Dev utils
import os,sys,traceback
@route('/reload')
def refresh():
    try:
        reload(sys.modules[__name__]) 
        return("Done :)")
    except:
        return(traceback.format_exc())

@route('/sys')
def sys_call(): 
    import os,time
    return( "\n".join( [ "<li> %s : %s </li>"%(x,y) for x,y in [ 
    ["pwd"    , os.path.abspath(".")],
    ["date"   , time.asctime()],
    ["src"    , __file__],
    ["module" , __name__],
    ]])
    )

@route('/wsgi') 
def show_wsgi():     
    from bottle import request
    return(str(request.environ).replace(",",",</br>"))

@route('/clearlogs')
def clearlogs(): 
    import os,time
    for filename in [
            "/var/log/derivationbud.pythonanywhere.com.access.log",
            "/var/log/derivationbud.pythonanywhere.com.error.log",
            ]:
        if os.path.exists(filename): os.remove(filename)
        fo = file(filename,"w")
        print >>fo,"Cleared on client's request at",time.asctime()
        fo.close()
    return("Done")

#----------------------------- Bottle basics
@route('/helloWorld')
def say_hello():
    return 'helloWorld'

from bottle import template
@route('/hello') 
@route('/hello/<name>') 
def hello(name='World'):     
    return template('hello_template',name=name)

from bottle import static_file
@route('/staticFile')
def serve_this_file():
    print >>sys.stderr,"MSG:",__file__+"demos/demo_static/"
    return static_file("singlefile.html",root=__file__+"/../demos/demo_static/")

@route('/staticFolder/<filepath:path>')
@route('/staticFolder')
def serve_this_folder(filepath="index.html"):
    return static_file(filepath,root=__file__+"/../demos/demo_static")

@route('/filexchange/<filepath:path>')
@route('/filexchange')
def serve_this_folder(filepath="index.html"):
    return static_file(filepath,root=__file__+"/../demos/demo_filexchange")

@route('/ajsonplease')
def ajaxtest():    
    return { "colors"  : ["blue","red","green"],     
             "animals" : ["snake","fox","dog"],     
             "fruits"  : ["banana","orange","kiwi"],     
            }

@route('/acoockieplease') 
def counter():     
    from bottle import response,request
    count = int( request.cookies.get('counter', '0') )     
    count += 1     
    response.set_cookie('counter', str(count))     
    return 'You visited this page %d times' % count

@route('/demo_axel/<filepath:path>')
def serve_this_folder(filepath="index.xhtml"):
    return static_file(filepath,root=__file__+"/../demos/demo_axel")

@route('/upload', method='POST') 
def do_login():     
    from bottle import request
    category   = request.forms['category']     
    upload     = request.files['upload']     
    name, ext = os.path.splitext(upload.filename)     
    if ext not in ('.png','.jpg','.jpeg','.xml'):         
        return 'File extension not allowed:',ext      
    destination = os.path.realpath(__file__+"/../demos/demo_filexchange/uploads/"+upload.filename)
    fo = file(destination,"wb")
    buf = upload.file.read()
    fo.write( buf )
    fo.close()
    return 'OK'

@route('/download/<filename:path>') 
def download(filename):     
    return static_file(filename, root=__file__+"/../demos/demo_filexchange/uploads/", download=filename)

@route('/ajaxer') 
def serve_this_folder(filepath="index.html"):
    return static_file(filepath,root=__file__+"/../demos/demo_ajax")

#----------------------------- js demos

demos  = [
    ["demo_filerework"  ,"localStorage  ( text files buffers)"  ],
    ["demo_ajax"        ,"ajax          ( get a json )"  ],
    ["demo_svg"         ,"jquery.js+svg ( sliding cube )"    ],
    ["demo_processing"  ,"processing.js ( mouse animation )" ],
    ["demo_processing2" ,"processing.js ( commit chart )"    ],
    ["demo_dragdealer"  ,"dragdealer.js ( slider tablet-friendly )"  ],
    ["demo_d3js"        ,"d3.js         ( force-based graph )"       ],
    ["demo_d3js2"       ,"d3.js         ( xml-tree )"       ],
    ["demo_viewer3d"    ,"glge.js       ( webgl packaging viewer )"  ],
   #["demo_axel"        ,"axel.js       ( xml-editor )"  ],
    ["demo"             ,"three.js      ( coming soon )"  ],
    ["demo"             ,"orbx.js       ( too soon )"  ],
    ]

for demoFolder,demoDesc in demos:
    @route('/'+demoFolder+'/<urlpath:path>')
    @route('/'+demoFolder)
    def serve_this_demo(urlpath="index.html",folder=demoFolder):
        #print >>sys.stderr,"MSG:",folder,urlpath
        return static_file(urlpath,root=__file__+"/../demos/"+folder)

#----------------------------- Main page

@route('/static/<filepath:path>')
@route('/static')
def serve_this_folder(filepath="index.html"):
    return static_file(filepath,root=__file__+"/../static")

@route('/')
def main_gate():
    pageStart = ['<!doctype html>',
                 '<head >',
                 '<link rel="SHORTCUT ICON" href="/static/flyingsquirrel.png">',
                 '</head >',
                 '<body bgcolor="#fff">',
                 '<div id="header">','<img src="/static/flyingsquirrelBanner.png">','</div>'
                 '<div id="content" style="margin-left:15px">',
                 ]
    pageEnd   = ['</div>',
                 '</body>',
                 '</html>']

    return( pageStart+
            [ '<li> <a href="%s"> %s </a> </li>'%(x,y) for x,y in [
                ["nowhere"      , "404 trap"                ],
                ["reload"       , "module reload"           ],
                ["clearlogs"    , "clear logs"              ],
                ["sys"          , "server-side info"        ],
                ["wsgi"         , "Wsgi environment"        ],
                ["helloWorld"   , "server says hello"       ],
                ["staticFile"   , "static file"             ],
                ["staticFolder" , "static folder"           ],
                ["filexchange"  , "file upload"             ],
                ["hello/you"    , "template with name=you"  ],
                ["hello/me"     , "template with name=me"   ],
                ["download/CorporateLogo.jpg" , "file download" ],
                ["acoockieplease" , "get a coockie"         ],
                ["ajsonplease"  , "get a json"         ],
                ["demo_axel/index.xhtml"    , "axel.js ( xml-editor) "  ],
                ]+demos
            ]+pageEnd
            )

application = default_app()

