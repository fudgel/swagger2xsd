// Declare variables
var yaml = require('yamljs'),
    defs, attributes,
    qual, attrType, 
    minOccurs, maxOccurs,
    schema = '',
    simpleType = ''
    op = 'genXSD'
    fs = require('fs'); 

// CLI Arguement
// var file = String(process.argv.slice(2));

// Load yaml file using YAML.load 
var swaggerJson = yaml.load('test/swagger.yaml');
//var swaggerJson = yaml.load(file);
if (swaggerJson){
    switch(op){
      case 'genXSD':
        generateXSD(null,swaggerJson);
        break;
    }
}

// Helper to capitalise first letter of a string :)
function capitaliseFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

// Generate SimpleType for enumerated values
function generateSimpleType(err, qual, key, dataType, values) {
    if (err) throw err
    // just get definitions of types
    simpleType = simpleType+'\t<xs:simpleType name="'+qual+capitaliseFirstLetter(key)+'Type">\n\t\t<xs:restriction base="xs:'+dataType+'">';
    for (var value in values)
    {
        simpleType = simpleType+'\n\t\t\t<xs:enumeration value="'+values[value]+'"/>';
    }
    simpleType = simpleType+'\n\t\t</xs:restriction>\n\t</xs:simpleType>\n';
}

// Write the callback function
function generateXSD(err, data) {
    if (err) throw err
    // just get definitions of types
    defs = data.definitions;
    var aoiDomain = data.info["x-domain"];
    // for each class
    schema = '<?xml version="1.0" encoding="UTF-8"?>\n<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema" targetNamespace="https://www.example.com" xmlns="https://www.example.com" elementFormDefault="qualified">\n';
    for (var def in defs)
    {
        // class qualifier - used to construct the qualified name
        qual = def;
        schema = schema+'\t<xs:complexType name="'+qual+'">\n\t\t<xs:sequence>\n';
        // Ignore 'Error' class
        attributes = defs[qual];
        // for each field, determine the type (i.e. XSD simple or construct complexType)
        for(var key in attributes["properties"])
        {   
            // If type is array, this is actually an element with a complex type - find it - assume unbounded
            (attributes.properties[key].required && attributes.properties[key].required==true) ? minOccurs = '1' : minOccurs = '0';

            if(attributes.properties[key].type && attributes.properties[key].type=="array") {
                // If reference to other complext type
                switch(attributes.properties[key].items.type){
                    case '$ref':
                        attrType = "xmlns:"+attributes.properties[key].items["$ref"].split(/[/ ]+/).pop();
                        maxOccurs = 'unbounded';
                        break;
                    case 'string':
                        attrType = "xmlns:"+attributes.properties[key].items.type;
                        maxOccurs = 'unbounded';
                        break;
                    default:
                        attrType = "xmlns:"+attributes.properties[key].items["$ref"].split(/[/ ]+/).pop();
                        maxOccurs = 'unbounded';
                        break;
                        //console.log("WARNING: Can't Process ["+key+"] with array type of +["+attributes.properties[key].items.type+"]");
                }

            } else {
                // special handling of known types - default is a catch all - will fail in XSD validation but can be corrected then
                switch (attributes.properties[key].type){
                    // convert 'number' to decimal
                    case "number":
                        attrType = "xs:decimal";
                        break;
                    // if not a special case (or not supported type), set the type as per swagger spec
                    default:
                        attrType = "xs:"+attributes.properties[key].type;

                }

                // Check for enumberated values, is so tigger simple type logic
                if(attributes.properties[key].enum){
                    generateSimpleType(null,qual,key,attributes.properties[key].type,attributes.properties[key].enum);
                    attrType = "xmlns:"+qual+capitaliseFirstLetter(key)+"Type";
                }
                // if simple type, assume maxOccurs of 1
                maxOccurs = '1';
            }
            // construct the 'element' line
            schema = schema+'\t\t\t<xs:element name="'+key+'" type="'+attrType+'" minOccurs="'+minOccurs+'" maxOccurs="'+maxOccurs+'"/>\n'
        }
        // close the Complex Type
        schema = schema+'\t\t</xs:sequence>\n\t</xs:complexType>\n';
    }
    // add simple type definitions
    schema = schema+simpleType;

    // close out the schema
    schema = schema+'</xs:schema>\n';
    // TODO: write to file
    console.log(schema);
}

