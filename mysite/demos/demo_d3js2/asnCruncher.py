#!/usr/bin/env python
import xml.etree.ElementTree as ET 
tree = ET.parse('ProtocolDescription.xml') 
root = tree.getroot()
fo = file("ProtocolDescription.json","w")
print "Creating",fo.name

print >>fo,'{"name":"asn"',
def walk(node,level):
    children=False
    if level:   print >>fo,'\n%s{ "name": "%s"'%(level*"  ",node.attrib["name"]),
    if "optional" in node.attrib:   print >>fo,', "optional" : true',
    else:                           print >>fo,', "optional" : false',
    for child in node.findall("./field")+node.findall("./type/field"):
        if children:    print >>fo,",",
        else:           
                        children=True
                        print >>fo,', "children" : [',
        walk(child,level+1)
    for child in node.findall("./values/value"):
        if children:    print >>fo,",",
        else:           
                        children=True
                        print >>fo,', "children" : [',
        print >>fo,'\n%s { "name": "(%s)%s" }'%(level*"  ",child.attrib["number"],child.attrib["name"]),
    if level: 
        if children:                  print >>fo,'\n%s]}'%(level*"  "),
        elif "type"   in node.attrib: print >>fo,', "children" : [ { "name" : "'+node.attrib[  "type"]+'"}]}',
        else:                         print >>fo,'}',

walk(root,0)
print >>fo,']}',
fo.close()

