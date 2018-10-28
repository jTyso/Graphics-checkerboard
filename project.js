//!!!!!! Not all work is original. Adapted from professor Holey's FlyOverGlobe
//example along with other programs in the handouts folder!!!!!!!!
var canvas;
var gl;

var godMatrix2 = mat4();
// Projection transformation parameters
var   fieldOfViewY = 100.0,
      aspectRatio  =  1.0, // actual value set in init
      zNear        =  1.0,
      zFar         = 20.0;

var modelViewLoc;  // uniform location of the modelView matrix

// parameters for viewer position
const initViewerDist  =  2.5;
var   eye             = vec3(0.0, 0.0, initViewerDist);
const at              = vec3(0.0, 0.0, 0.0);
const up              = vec3(0.0, 1.0, 0.0);

var projectionLoc;  // uniform location of the projection matrix

const darkGray  = vec4(0.3, 0.3, 0.3, 1.0);
const gray      = vec4(0.6, 0.6, 0.6, 1.0);
const white     = vec4(1.0, 1.0, 1.0, 1.0);
const darkRed   = vec4(0.4, 0.0, 0.0, 1.0);
const red       = vec4(0.9, 0.0, 0.0, 1.0);
const green     = vec4(0.0, 0.8, 0.0, 1.0);
const blue      = vec4(0.1, 0.1, 1.0, 1.0);

const lightAmb  = gray;
const lightDiff = white;
const lightSpec = white;

const lightPos  = vec4(0, 0.5, 0, 1.0);

var points = [];
var normals = [];

var cubeNumVertices = 0;
var checkNumVertices = 0;
var texSize = 64;

var light_position;
var ambient_product;
var diffuse_product;
var specular_product;
var shininess;

const cubeAmb   = red;
const cubeDiff  = red;
const cubeSpec  = red;
const cubeShin  = 200.0;

const checkerAmb   = blue;
const checkerDiff  = blue;
const checkerSpec  = white;
const checkerShin  = 50.0;

const checker2Amb   = green;
const checker2Diff  = green;
const checker2Spec  = white;
const checker2Shin  = 50.0;

const startEye        = vec3(0.0, 0.0, initViewerDist);;
const startAt         = vec3(0.0, 0.0, 0.0);

var flying = false;
var   fdx, fdy, fdz;
const flyDelta        = 0.005;


// Create a checkerboard pattern using floats
var image1 = new Array()
    for (var i =0; i<texSize; i++)  image1[i] = new Array();
    for (var i =0; i<texSize; i++)
        for ( var j = 0; j < texSize; j++)
           image1[i][j] = new Float32Array(4);
    for (var i =0; i<texSize; i++) for (var j=0; j<texSize; j++) {
        var c = (((i & 0x8) == 0) ^ ((j & 0x8)  == 0));
        image1[i][j] = [c, c, c, 1];
    }

// Convert floats to ubytes for texture

var image2 = new Uint8Array(4*texSize*texSize);

    for ( var i = 0; i < texSize; i++ )
        for ( var j = 0; j < texSize; j++ )
           for(var k =0; k<4; k++)
                image2[4*texSize*i+4*j+k] = 255*image1[i][j][k];

var texCoordsArray = [];

var texCoord = [
    vec2(0, 0),
    vec2(0, 1),
    vec2(1, 1),
    vec2(1, 0)
];

window.onload = function init()
{
    canvas = document.getElementById( "gl-canvas" );

    gl = WebGLUtils.setupWebGL( canvas );
    if ( !gl ) { alert( "WebGL isn't available" ); }
   
    gl.viewport( 0, 0, canvas.width, canvas.height );
    gl.clearColor( 0.0, 0.0, 0.0, 1.0 );

    gl.enable(gl.DEPTH_TEST);

    aspectRatio = canvas.width / canvas.height;

    //
    //  Load shaders and initialize attribute buffers
    //
    var program = initShaders(gl, "vertex-shader", "fragment-shader");
    gl.useProgram( program );

    createBoard();
    createChecker();


    var cBuffer = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, cBuffer );
    gl.bufferData( gl.ARRAY_BUFFER, flatten(normals), gl.STATIC_DRAW );
    var vNormal = gl.getAttribLocation( program, "vNormal" );
    gl.vertexAttribPointer( vNormal, 3, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vNormal );

    var vBuffer = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, vBuffer );
    gl.bufferData( gl.ARRAY_BUFFER, flatten(points), gl.STATIC_DRAW );
    var vPosition = gl.getAttribLocation( program, "vPosition" );
    gl.vertexAttribPointer( vPosition, 4, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vPosition );

    var tBuffer = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, tBuffer);
    gl.bufferData( gl.ARRAY_BUFFER, flatten(texCoordsArray), gl.STATIC_DRAW );
    var vTexCoord = gl.getAttribLocation( program, "vTexCoord");
    gl.vertexAttribPointer(vTexCoord, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vTexCoord);

    modelViewLoc = gl.getUniformLocation(program, "model_view");
    projectionLoc =  gl.getUniformLocation(program, "projection");

    normalLoc        = gl.getUniformLocation(program, "normal_mat");
    ambient_product  = gl.getUniformLocation(program, "ambient_product");
    diffuse_product  = gl.getUniformLocation(program, "diffuse_product");
    specular_product = gl.getUniformLocation(program, "specular_product");
    shininess        = gl.getUniformLocation(program, "shininess");
    light_position   = gl.getUniformLocation(program, "light_position");
    configureTexture(image2);

    document.getElementById( "start" ).onclick = function () {
      flying    = true;
      var dvx   = at[0] - eye[0];
      var dvy   = at[1] - eye[1];
      var dvz   = at[2] - eye[2];
      var vDist = Math.sqrt(dvx*dvx + dvy*dvy + dvz*dvz);
      fdx       = flyDelta * dvx / vDist;
      fdy       = flyDelta * dvy / vDist;
      fdz       = flyDelta * dvz / vDist;
      requestAnimFrame(render);
    };
    document.getElementById( "stop" ).onclick = function () {
    for (var i = 0; i < 3; i++) {
    eye[i] = startEye[i];
    at[i]  = startAt[i];
      }
      flying       = false
      
      requestAnimFrame(render);
    };

    render();
}

function configureTexture(image) {
    var texture = gl.createTexture();
    gl.activeTexture( gl.TEXTURE0 );
    gl.bindTexture( gl.TEXTURE_2D, texture );
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, texSize, texSize, 0,
        gl.RGBA, gl.UNSIGNED_BYTE, image);
    gl.generateMipmap( gl.TEXTURE_2D );
    gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER,
        gl.NEAREST_MIPMAP_LINEAR );
    gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST );
}

function createBoard()
{
    quad( 1, 0, 3, 2 );
    quad( 2, 3, 7, 6 );
    quad( 3, 0, 4, 7 );
    quad( 6, 5, 1, 2 );
    quad( 4, 5, 6, 7 );
    quad( 5, 4, 0, 1 );
}

function quad(a, b, c, d)
{
    var vertices = [
        vec4( -0.5, -0.5,  0.5, 1.0 ),  //0
        vec4( -0.5,  -0.45,  0.5, 1.0 ),  //1
        vec4(  0.5,  -0.45,  0.5, 1.0 ),  //2
        vec4(  0.5, -0.5,  0.5, 1.0 ),  //3
        vec4( -0.5, -0.5, -0.5, 1.0 ),  //4
        vec4( -0.5,  -0.45, -0.5, 1.0 ),  //5
        vec4(  0.5,  -0.45, -0.5, 1.0 ),  //6
        vec4(  0.5, -0.5, -0.5, 1.0 )   //7
    ];

    var indices = [ a, b, c, a, c, d ];

    for ( var i = 0; i < indices.length; ++i ) {
        points.push( vertices[indices[i]] );
        normals.push(normalize (vertices[indices[i]] ));
        cubeNumVertices++;

    }

         texCoordsArray.push(texCoord[0]);
         texCoordsArray.push(texCoord[1]);
         texCoordsArray.push(texCoord[2]);
         texCoordsArray.push(texCoord[0]);
         texCoordsArray.push(texCoord[2]);
         texCoordsArray.push(texCoord[3]);
}


function createChecker(){
    checker( 0, 3, 2, 1 );
    checker( 1, 4, 4, 0 );
    checker( 2, 4, 4, 1 );
    checker( 3, 4, 4, 2 );
    checker( 4, 4, 3, 0);

   
}

function checker(a, b, c, d ){
   var checkVerts = [
        vec4( 0, 0,  0, 1.0 ),  //0
        vec4( 0.5,  0,  0, 1.0 ),  //1
        vec4( 0.5, 0, 0.5, 1.0),    //2
        vec4(  0,  0,  0.5, 1.0 ),  //3
        vec4(  0.25, 0.5,  0.25, 1.0 ),  //4
    ];

    var checkIndices = [ a, b, c, a, c, d ];

    for ( var i = 0; i < checkIndices.length; ++i ) {
        points.push( checkVerts[checkIndices[i]] );
        normals.push(normalize (checkVerts[checkIndices[i]] ));
        checkNumVertices++;
    }

         texCoordsArray.push(0);
         texCoordsArray.push(0);
         texCoordsArray.push(0);
         texCoordsArray.push(0);
         texCoordsArray.push(0);
         texCoordsArray.push(0);
}

//-------------------------------------------------------------------------

function render()
{
    gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);


    var projection = perspective(fieldOfViewY, aspectRatio, zNear, zFar);
    gl.uniformMatrix4fv(projectionLoc, false, flatten(projection));

    var viewer = lookAt(eye, at, up);

   var newLightPos = vec4();
   for (i = 0; i < 3; i++) {
    newLightPos[i] = dot(viewer[i], lightPos);
  }
  gl.uniform4fv(light_position, newLightPos);


  //draw the board
  godMatrix2 = mult(viewer, mult(mult(translate(0, -0.1, 0.41),rotate(0, 0, 1.0, 0.0)), scalem(1.68, 2, 1.68)));
  var normalMat = normalMatrix(godMatrix2, true);
  gl.uniformMatrix3fv(normalLoc, false, flatten(normalMat));
  gl.uniformMatrix4fv(modelViewLoc, false, flatten(godMatrix2));
  gl.uniform4fv(ambient_product,  mult(lightAmb,  cubeAmb));
  gl.uniform4fv(diffuse_product,  mult(lightDiff, cubeDiff));
  gl.uniform4fv(specular_product, mult(lightSpec, cubeSpec));
  gl.uniform1f(shininess, cubeShin);
  gl.drawArrays(gl.TRIANGLES, 0, cubeNumVertices);

  //-------------------------draw the checkers --------------------------------------------------
  godMatrix2 = mult(viewer, mult(mult(translate(-0.8, -1, 1.08),rotate(0, 0, 0.5, 0.0)), scalem(0.3, 0.3, 0.3)));
  var normalMat = normalMatrix(godMatrix2, true);
  gl.uniformMatrix3fv(normalLoc, false, flatten(normalMat));
  gl.uniformMatrix4fv(modelViewLoc, false, flatten(godMatrix2));
  gl.uniform4fv(ambient_product,  mult(lightAmb,  checkerAmb));
  gl.uniform4fv(diffuse_product,  mult(lightDiff, checkerDiff));
  gl.uniform4fv(specular_product, mult(lightSpec, checkerSpec));
  gl.uniform1f(shininess, checkerShin);
  gl.drawArrays(gl.TRIANGLES, cubeNumVertices, checkNumVertices);

  godMatrix2 = mult(viewer, mult(mult(translate(-0.39, -1, 1.08),rotate(0, 0, 0.5, 0.0)), scalem(0.3, 0.3, 0.3)));
  var normalMat = normalMatrix(godMatrix2, true);
  gl.uniformMatrix3fv(normalLoc, false, flatten(normalMat));
  gl.uniformMatrix4fv(modelViewLoc, false, flatten(godMatrix2));
  gl.uniform4fv(ambient_product,  mult(lightAmb,  checkerAmb));
  gl.uniform4fv(diffuse_product,  mult(lightDiff, checkerDiff));
  gl.uniform4fv(specular_product, mult(lightSpec, checkerSpec));
  gl.uniform1f(shininess, checkerShin);
  gl.drawArrays(gl.TRIANGLES, cubeNumVertices, checkNumVertices);   

  godMatrix2 = mult(viewer, mult(mult(translate(0.03, -1, 1.08),rotate(0, 0, 0.5, 0.0)), scalem(0.3, 0.3, 0.3)));
  var normalMat = normalMatrix(godMatrix2, true);
  gl.uniformMatrix3fv(normalLoc, false, flatten(normalMat));
  gl.uniformMatrix4fv(modelViewLoc, false, flatten(godMatrix2));
  gl.uniform4fv(ambient_product,  mult(lightAmb,  checkerAmb));
  gl.uniform4fv(diffuse_product,  mult(lightDiff, checkerDiff));
  gl.uniform4fv(specular_product, mult(lightSpec, checkerSpec));
  gl.uniform1f(shininess, checkerShin);
  gl.drawArrays(gl.TRIANGLES, cubeNumVertices, checkNumVertices);  

  godMatrix2 = mult(viewer, mult(mult(translate(0.45, -1, 1.08),rotate(0, 0, 0.5, 0.0)), scalem(0.3, 0.3, 0.3)));
  var normalMat = normalMatrix(godMatrix2, true);
  gl.uniformMatrix3fv(normalLoc, false, flatten(normalMat));
  gl.uniformMatrix4fv(modelViewLoc, false, flatten(godMatrix2));
  gl.uniform4fv(ambient_product,  mult(lightAmb,  checkerAmb));
  gl.uniform4fv(diffuse_product,  mult(lightDiff, checkerDiff));
  gl.uniform4fv(specular_product, mult(lightSpec, checkerSpec));
  gl.uniform1f(shininess, checkerShin);
  gl.drawArrays(gl.TRIANGLES, cubeNumVertices, checkNumVertices);  


  godMatrix2 = mult(viewer, mult(mult(translate(-0.60, -1, 0.85),rotate(0, 0, 0.5, 0.0)), scalem(0.3, 0.3, 0.3)));
  var normalMat = normalMatrix(godMatrix2, true);
  gl.uniformMatrix3fv(normalLoc, false, flatten(normalMat));
  gl.uniformMatrix4fv(modelViewLoc, false, flatten(godMatrix2));
  gl.uniform4fv(ambient_product,  mult(lightAmb,  checkerAmb));
  gl.uniform4fv(diffuse_product,  mult(lightDiff, checkerDiff));
  gl.uniform4fv(specular_product, mult(lightSpec, checkerSpec));
  gl.uniform1f(shininess, checkerShin);
  gl.drawArrays(gl.TRIANGLES, cubeNumVertices, checkNumVertices);

  godMatrix2 = mult(viewer, mult(mult(translate(-0.18, -1, 0.85),rotate(0, 0, 0.5, 0.0)), scalem(0.3, 0.3, 0.3)));
  var normalMat = normalMatrix(godMatrix2, true);
  gl.uniformMatrix3fv(normalLoc, false, flatten(normalMat));
  gl.uniformMatrix4fv(modelViewLoc, false, flatten(godMatrix2));
  gl.uniform4fv(ambient_product,  mult(lightAmb,  checkerAmb));
  gl.uniform4fv(diffuse_product,  mult(lightDiff, checkerDiff));
  gl.uniform4fv(specular_product, mult(lightSpec, checkerSpec));
  gl.uniform1f(shininess, checkerShin);
  gl.drawArrays(gl.TRIANGLES, cubeNumVertices, checkNumVertices);

  godMatrix2 = mult(viewer, mult(mult(translate(0.24, -1, 0.85),rotate(0, 0, 0.5, 0.0)), scalem(0.3, 0.3, 0.3)));
  var normalMat = normalMatrix(godMatrix2, true);
  gl.uniformMatrix3fv(normalLoc, false, flatten(normalMat));
  gl.uniformMatrix4fv(modelViewLoc, false, flatten(godMatrix2));
  gl.uniform4fv(ambient_product,  mult(lightAmb,  checkerAmb));
  gl.uniform4fv(diffuse_product,  mult(lightDiff, checkerDiff));
  gl.uniform4fv(specular_product, mult(lightSpec, checkerSpec));
  gl.uniform1f(shininess, checkerShin);
  gl.drawArrays(gl.TRIANGLES, cubeNumVertices, checkNumVertices);

  godMatrix2 = mult(viewer, mult(mult(translate(0.65, -1, 0.85),rotate(0, 0, 0.5, 0.0)), scalem(0.3, 0.3, 0.3)));
  var normalMat = normalMatrix(godMatrix2, true);
  gl.uniformMatrix3fv(normalLoc, false, flatten(normalMat));
  gl.uniformMatrix4fv(modelViewLoc, false, flatten(godMatrix2));
  gl.uniform4fv(ambient_product,  mult(lightAmb,  checkerAmb));
  gl.uniform4fv(diffuse_product,  mult(lightDiff, checkerDiff));
  gl.uniform4fv(specular_product, mult(lightSpec, checkerSpec));
  gl.uniform1f(shininess, checkerShin);
  gl.drawArrays(gl.TRIANGLES, cubeNumVertices, checkNumVertices);

  godMatrix2 = mult(viewer, mult(mult(translate(-0.8, -1, 0.65),rotate(0, 0, 0.5, 0.0)), scalem(0.3, 0.3, 0.3)));
  var normalMat = normalMatrix(godMatrix2, true);
  gl.uniformMatrix3fv(normalLoc, false, flatten(normalMat));
  gl.uniformMatrix4fv(modelViewLoc, false, flatten(godMatrix2));
  gl.uniform4fv(ambient_product,  mult(lightAmb,  checkerAmb));
  gl.uniform4fv(diffuse_product,  mult(lightDiff, checkerDiff));
  gl.uniform4fv(specular_product, mult(lightSpec, checkerSpec));
  gl.uniform1f(shininess, checkerShin);
  gl.drawArrays(gl.TRIANGLES, cubeNumVertices, checkNumVertices);

  godMatrix2 = mult(viewer, mult(mult(translate(-0.39, -1, 0.65),rotate(0, 0, 0.5, 0.0)), scalem(0.3, 0.3, 0.3)));
  var normalMat = normalMatrix(godMatrix2, true);
  gl.uniformMatrix3fv(normalLoc, false, flatten(normalMat));
  gl.uniformMatrix4fv(modelViewLoc, false, flatten(godMatrix2));
  gl.uniform4fv(ambient_product,  mult(lightAmb,  checkerAmb));
  gl.uniform4fv(diffuse_product,  mult(lightDiff, checkerDiff));
  gl.uniform4fv(specular_product, mult(lightSpec, checkerSpec));
  gl.uniform1f(shininess, checkerShin);
  gl.drawArrays(gl.TRIANGLES, cubeNumVertices, checkNumVertices);

  godMatrix2 = mult(viewer, mult(mult(translate(0.03, -1, 0.65),rotate(0, 0, 0.5, 0.0)), scalem(0.3, 0.3, 0.3)));
  var normalMat = normalMatrix(godMatrix2, true);
  gl.uniformMatrix3fv(normalLoc, false, flatten(normalMat));
  gl.uniformMatrix4fv(modelViewLoc, false, flatten(godMatrix2));
  gl.uniform4fv(ambient_product,  mult(lightAmb,  checkerAmb));
  gl.uniform4fv(diffuse_product,  mult(lightDiff, checkerDiff));
  gl.uniform4fv(specular_product, mult(lightSpec, checkerSpec));
  gl.uniform1f(shininess, checkerShin);
  gl.drawArrays(gl.TRIANGLES, cubeNumVertices, checkNumVertices);

   godMatrix2 = mult(viewer, mult(mult(translate(0.45, -1, 0.65),rotate(0, 0, 0.5, 0.0)), scalem(0.3, 0.3, 0.3)));
  var normalMat = normalMatrix(godMatrix2, true);
  gl.uniformMatrix3fv(normalLoc, false, flatten(normalMat));
  gl.uniformMatrix4fv(modelViewLoc, false, flatten(godMatrix2));
  gl.uniform4fv(ambient_product,  mult(lightAmb,  checkerAmb));
  gl.uniform4fv(diffuse_product,  mult(lightDiff, checkerDiff));
  gl.uniform4fv(specular_product, mult(lightSpec, checkerSpec));
  gl.uniform1f(shininess, checkerShin);
  gl.drawArrays(gl.TRIANGLES, cubeNumVertices, checkNumVertices);  

  //-------------------------------Green side Checkers ----------------------------------

  godMatrix2 = mult(viewer, mult(mult(translate(-0.6, -1, -0.4),rotate(0, 0, 0.5, 0.0)), scalem(0.3, 0.3, 0.3)));
  var normalMat = normalMatrix(godMatrix2, true);
  gl.uniformMatrix3fv(normalLoc, false, flatten(normalMat));
  gl.uniformMatrix4fv(modelViewLoc, false, flatten(godMatrix2));
  gl.uniform4fv(ambient_product,  mult(lightAmb,  checker2Amb));
  gl.uniform4fv(diffuse_product,  mult(lightDiff, checker2Diff));
  gl.uniform4fv(specular_product, mult(lightSpec, checker2Spec));
  gl.uniform1f(shininess, checkerShin);
  gl.drawArrays(gl.TRIANGLES, cubeNumVertices, checkNumVertices);

  godMatrix2 = mult(viewer, mult(mult(translate(-0.19, -1, -0.4),rotate(0, 0, 0.5, 0.0)), scalem(0.3, 0.3, 0.3)));
  var normalMat = normalMatrix(godMatrix2, true);
  gl.uniformMatrix3fv(normalLoc, false, flatten(normalMat));
  gl.uniformMatrix4fv(modelViewLoc, false, flatten(godMatrix2));
  gl.uniform4fv(ambient_product,  mult(lightAmb,  checker2Amb));
  gl.uniform4fv(diffuse_product,  mult(lightDiff, checker2Diff));
  gl.uniform4fv(specular_product, mult(lightSpec, checker2Spec));
  gl.uniform1f(shininess, checkerShin);
  gl.drawArrays(gl.TRIANGLES, cubeNumVertices, checkNumVertices);

    godMatrix2 = mult(viewer, mult(mult(translate(0.24, -1, -0.4),rotate(0, 0, 0.5, 0.0)), scalem(0.3, 0.3, 0.3)));
  var normalMat = normalMatrix(godMatrix2, true);
  gl.uniformMatrix3fv(normalLoc, false, flatten(normalMat));
  gl.uniformMatrix4fv(modelViewLoc, false, flatten(godMatrix2));
  gl.uniform4fv(ambient_product,  mult(lightAmb,  checker2Amb));
  gl.uniform4fv(diffuse_product,  mult(lightDiff, checker2Diff));
  gl.uniform4fv(specular_product, mult(lightSpec, checker2Spec));
  gl.uniform1f(shininess, checkerShin);
  gl.drawArrays(gl.TRIANGLES, cubeNumVertices, checkNumVertices)


  godMatrix2 = mult(viewer, mult(mult(translate(0.65, -1, -0.4),rotate(0, 0, 0.5, 0.0)), scalem(0.3, 0.3, 0.3)));
  var normalMat = normalMatrix(godMatrix2, true);
  gl.uniformMatrix3fv(normalLoc, false, flatten(normalMat));
  gl.uniformMatrix4fv(modelViewLoc, false, flatten(godMatrix2));
  gl.uniform4fv(ambient_product,  mult(lightAmb,  checker2Amb));
  gl.uniform4fv(diffuse_product,  mult(lightDiff, checker2Diff));
  gl.uniform4fv(specular_product, mult(lightSpec, checker2Spec));
  gl.uniform1f(shininess, checkerShin);
  gl.drawArrays(gl.TRIANGLES, cubeNumVertices, checkNumVertices)


  godMatrix2 = mult(viewer, mult(mult(translate(-0.82, -1, 0.02),rotate(0, 0, 0.5, 0.0)), scalem(0.3, 0.3, 0.3)));
  var normalMat = normalMatrix(godMatrix2, true);
  gl.uniformMatrix3fv(normalLoc, false, flatten(normalMat));
  gl.uniformMatrix4fv(modelViewLoc, false, flatten(godMatrix2));
  gl.uniform4fv(ambient_product,  mult(lightAmb,  checker2Amb));
  gl.uniform4fv(diffuse_product,  mult(lightDiff, checker2Diff));
  gl.uniform4fv(specular_product, mult(lightSpec, checker2Spec));
  gl.uniform1f(shininess, checkerShin);
  gl.drawArrays(gl.TRIANGLES, cubeNumVertices, checkNumVertices)

  godMatrix2 = mult(viewer, mult(mult(translate(-0.40, -1, 0.02),rotate(0, 0, 0.5, 0.0)), scalem(0.3, 0.3, 0.3)));
  var normalMat = normalMatrix(godMatrix2, true);
  gl.uniformMatrix3fv(normalLoc, false, flatten(normalMat));
  gl.uniformMatrix4fv(modelViewLoc, false, flatten(godMatrix2));
  gl.uniform4fv(ambient_product,  mult(lightAmb,  checker2Amb));
  gl.uniform4fv(diffuse_product,  mult(lightDiff, checker2Diff));
  gl.uniform4fv(specular_product, mult(lightSpec, checker2Spec));
  gl.uniform1f(shininess, checkerShin);
  gl.drawArrays(gl.TRIANGLES, cubeNumVertices, checkNumVertices)

  godMatrix2 = mult(viewer, mult(mult(translate(0.03, -1, 0.02),rotate(0, 0, 0.5, 0.0)), scalem(0.3, 0.3, 0.3)));
  var normalMat = normalMatrix(godMatrix2, true);
  gl.uniformMatrix3fv(normalLoc, false, flatten(normalMat));
  gl.uniformMatrix4fv(modelViewLoc, false, flatten(godMatrix2));
  gl.uniform4fv(ambient_product,  mult(lightAmb,  checker2Amb));
  gl.uniform4fv(diffuse_product,  mult(lightDiff, checker2Diff));
  gl.uniform4fv(specular_product, mult(lightSpec, checker2Spec));
  gl.uniform1f(shininess, checkerShin);
  gl.drawArrays(gl.TRIANGLES, cubeNumVertices, checkNumVertices)


  godMatrix2 = mult(viewer, mult(mult(translate(0.45, -1, 0.02),rotate(0, 0, 0.5, 0.0)), scalem(0.3, 0.3, 0.3)));
  var normalMat = normalMatrix(godMatrix2, true);
  gl.uniformMatrix3fv(normalLoc, false, flatten(normalMat));
  gl.uniformMatrix4fv(modelViewLoc, false, flatten(godMatrix2));
  gl.uniform4fv(ambient_product,  mult(lightAmb,  checker2Amb));
  gl.uniform4fv(diffuse_product,  mult(lightDiff, checker2Diff));
  gl.uniform4fv(specular_product, mult(lightSpec, checker2Spec));
  gl.uniform1f(shininess, checkerShin);
  gl.drawArrays(gl.TRIANGLES, cubeNumVertices, checkNumVertices)


  godMatrix2 = mult(viewer, mult(mult(translate(0.65, -1, 0.24),rotate(0, 0, 0.5, 0.0)), scalem(0.3, 0.3, 0.3)));
  var normalMat = normalMatrix(godMatrix2, true);
  gl.uniformMatrix3fv(normalLoc, false, flatten(normalMat));
  gl.uniformMatrix4fv(modelViewLoc, false, flatten(godMatrix2));
  gl.uniform4fv(ambient_product,  mult(lightAmb,  checker2Amb));
  gl.uniform4fv(diffuse_product,  mult(lightDiff, checker2Diff));
  gl.uniform4fv(specular_product, mult(lightSpec, checker2Spec));
  gl.uniform1f(shininess, checkerShin);
  gl.drawArrays(gl.TRIANGLES, cubeNumVertices, checkNumVertices)

  godMatrix2 = mult(viewer, mult(mult(translate(0.24, -1, 0.24),rotate(0, 0, 0.5, 0.0)), scalem(0.3, 0.3, 0.3)));
  var normalMat = normalMatrix(godMatrix2, true);
  gl.uniformMatrix3fv(normalLoc, false, flatten(normalMat));
  gl.uniformMatrix4fv(modelViewLoc, false, flatten(godMatrix2));
  gl.uniform4fv(ambient_product,  mult(lightAmb,  checker2Amb));
  gl.uniform4fv(diffuse_product,  mult(lightDiff, checker2Diff));
  gl.uniform4fv(specular_product, mult(lightSpec, checker2Spec));
  gl.uniform1f(shininess, checkerShin);
  gl.drawArrays(gl.TRIANGLES, cubeNumVertices, checkNumVertices)

  godMatrix2 = mult(viewer, mult(mult(translate(-0.18, -1, 0.24),rotate(0, 0, 0.5, 0.0)), scalem(0.3, 0.3, 0.3)));
  var normalMat = normalMatrix(godMatrix2, true);
  gl.uniformMatrix3fv(normalLoc, false, flatten(normalMat));
  gl.uniformMatrix4fv(modelViewLoc, false, flatten(godMatrix2));
  gl.uniform4fv(ambient_product,  mult(lightAmb,  checker2Amb));
  gl.uniform4fv(diffuse_product,  mult(lightDiff, checker2Diff));
  gl.uniform4fv(specular_product, mult(lightSpec, checker2Spec));
  gl.uniform1f(shininess, checkerShin);
  gl.drawArrays(gl.TRIANGLES, cubeNumVertices, checkNumVertices)

  godMatrix2 = mult(viewer, mult(mult(translate(-0.6, -1, 0.24),rotate(0, 0, 0.5, 0.0)), scalem(0.3, 0.3, 0.3)));
  var normalMat = normalMatrix(godMatrix2, true);
  gl.uniformMatrix3fv(normalLoc, false, flatten(normalMat));
  gl.uniformMatrix4fv(modelViewLoc, false, flatten(godMatrix2));
  gl.uniform4fv(ambient_product,  mult(lightAmb,  checker2Amb));
  gl.uniform4fv(diffuse_product,  mult(lightDiff, checker2Diff));
  gl.uniform4fv(specular_product, mult(lightSpec, checker2Spec));
  gl.uniform1f(shininess, checkerShin);
  gl.drawArrays(gl.TRIANGLES, cubeNumVertices, checkNumVertices)

if(flying)
    {
     // move viewer ahead
    eye[0] += fdx;
    eye[1] += fdy;
    eye[2] += fdz;
    at[0]  += fdx;
    at[1]  += fdy;
    at[2]  += fdz; 
    if (eye[2] < -1.0) flying =false;
    requestAnimFrame(render);
    }
}
