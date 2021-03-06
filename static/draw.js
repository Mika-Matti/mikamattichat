//täällä tehdään piirtokommunikointi serverin kanssa
var eraser = false; //pyyhin
var thefunBrush = false; //työkalusivellin
var brushSize = 1;
var brushColor = 'black';  
var clientHistory = [];

document.addEventListener("DOMContentLoaded", function()
{
    var mouse = {
        click: false,
        move: false,
        pos: {x:0, y:0},
        pos_prev: false
    };    

    //määritellään canvas elementtiä
    var canvas  = document.getElementById('drawing');
    var context = canvas.getContext('2d');
    canvas.style.width='100%';
    canvas.style.height='100%';
    var width = canvas.offsetWidth;
    var height = canvas.offsetHeight;

    canvas.width  = width;
    canvas.height = height;


    //jos ikkunan kokoa muutetaan
    window.onresize = function(e) 
    {
        width = canvas.offsetWidth;
        height = canvas.offsetHeight;

        canvas.width  = width;
        canvas.height = height;   
       
        //clientside resize
        updateCanvas();
    }

    //onko hiiri klikattuna
    canvas.onmousedown = function(e){ mouse.click = true; };
    //vai ei
    canvas.onmouseup = function(e){ mouse.click = false; };
    //hiiren liikkumisen rekisteröinti
    canvas.onmousemove = function(e)
    {   
        //normalisoi mouse position 0.0 - 1.0
        mouse.pos = {x:0, y:0};
        mouse.pos.x = ( e.clientX -2 ) / width;  // -10
        mouse.pos.y = ( e.clientY -42 ) / height; // -50 miinustaa ylläolevan headerin canvasista
        mouse.move = true;
    };
    //jos hiiri menee canvasin ulkopuolelle, laitetaan hiiri pois pohjasta ettei tule ylimääräisiä viivoja
    canvas.onmouseout = function(e)
    {
        mouse.click = false;
    };
    //piirrettyjen viivojen määrän koko kilobiteissä
    socket.on('get lines', function(data)
    {
        var html = '';
        html += "(" + data.toFixed(3) + " kilobytes) ";
        $("#lines").html(html);
    });    

    socket.on('clearit', function()
    {
        context.clearRect(0, 0, width, height);
        clientHistory = [];
        console.log("client clearit");
    });
    //update clientcanvas. Tuodaan ekaa kertaa serverin piirrot clientille ja päivitetään client array täsmäämään serverin arrayta.
    socket.on('get linearray', function(data)
    {
        //console.log("canvas tuotu");
        clientHistory = data.linehistory;   
        for (var i in clientHistory) 
        {   
            for (var a in clientHistory[i]) 
            {
                var line = clientHistory[i][a].line;  
                //piirretään puretut viivat        
                {                    
                    context.beginPath();
                    context.lineWidth = line[2]; //brushin paksuus
                    context.strokeStyle = line[3]; // brushin väri
                    context.moveTo(line[0].x * width, line[0].y * height);
                    context.lineTo(line[1].x * width, line[1].y * height);
                    context.stroke();
                }
            }
        }
    });
    socket.on('load canvas', function(data)
    {
        console.log("canvas tuotu");
        var loadcanvasArray = data.linehistory;   
        for (var i in loadcanvasArray) 
        {   
            clientHistory.push(loadcanvasArray[i]);
            for (var a in loadcanvasArray[i]) 
            {
                var line = loadcanvasArray[i][a].line;  
                //piirretään puretut viivat        
                {                    
                    context.beginPath();
                    context.lineWidth = line[2]; //brushin paksuus
                    context.strokeStyle = line[3]; // brushin väri
                    context.moveTo(line[0].x * width, line[0].y * height);
                    context.lineTo(line[1].x * width, line[1].y * height);
                    context.stroke();

                }
            }
        }

    });
    socket.on('send wholelinearray', function(data)
    {
        var wholelinebufferHistory = data.wholelinebufferarray;
        //työnnetään ensin kokonaiset viivat clientside arrayhyn
        for (var i in wholelinebufferHistory) 
        {
                clientHistory.push(wholelinebufferHistory[i]);
        }
    });
    //reaaliajassa piirrettävä data, jota ei tallenneta client arrayhyn. se vain näkyy canvasilla piirtona.
    socket.on('draw bufferarray', function(data)
    {
        var bufferHistory = data.bufferarray;
        // tehdään piirtäminen pienillä viivoilla        
        for (var i in bufferHistory)
        {                 
            var line = bufferHistory[i].line;

            //piirretään puretut viivat
                {                    
                context.beginPath();
                context.lineWidth = line[2]; //brushin paksuus
                context.strokeStyle = line[3]; // brushin väri
                context.moveTo(line[0].x * width, line[0].y * height);
                //context.lineTo(line[1].x * width, line[1].y * height + 10); tämä aiheuttaa siistin palikka brushin.
                context.lineTo(line[1].x * width, line[1].y * height);
                context.stroke();
                //näytetään piirtäessä piirtäjän userrname
                if(bufferHistory[i].user)
                {              
                    var whoIsdrawing = getNameElement(bufferHistory[i].user);
                    whoIsdrawing.style.left = line[1].x*width;
                    whoIsdrawing.style.top = line[1].y*height;  
                    whoIsdrawing.style.display = "block";    
                }     
            }
        }
    });
    //jos tulee viesti serveriltä käyttää eraseria clientsideen tätä ei kutsuta tällä hetkellä ollenkaan. eikä kutsutakaan enneku bufferarray on kunnollinen.
    socket.on('new eraser', function(data)
    {
        for (let i = 0; i < clientHistory.length; i++) //tämä on toimiva. pyyhin tekee viivan ja jos viiva osuu piirrettyyn lineen, se poistetaan
        {
            var foundLine = false;
            for (let a = 0; a < clientHistory[i].length; a++)
            {
                var line = clientHistory[i][a].line;
		  	    if ( LineToLineIntersection ( data.data.mouse.x, data.data.mouse.y, data.data.mouse2.x, data.data.mouse2.y, line[0].x, line[0].y, line[1].x, line[1].y ) )
                {
                    //console.log("Kumitus onnistui " + clientHistory.length);
                    clientHistory.splice ( i, 1 );
                    --i;
                    //foundLine = true;
                    //näytetään kuka poisti viivan                    
                    var whoIsdrawing = getNameElement(data.user);
                    whoIsdrawing.style.left = line[1].x*width;
                    whoIsdrawing.style.top = line[1].y*height;  
                    whoIsdrawing.style.display = "block";    
                    
                    break;
                }                   
            }   
            if (foundLine) 
            {
                //console.log("foundline break");
                break;
            }                
        }      
        updateCanvas(); //tee clientside versio tästä. sama ku resizessä.      
    });

    function updateCanvas()
    {
        //tyhjennetään canvas
        context.clearRect(0, 0, width, height);
        console.log("client clearit");
        //piirretään canvas uusiksi.
        for (var i in clientHistory) 
        {   
            for (var a in clientHistory[i]) 
            {
                var line = clientHistory[i][a].line;  
                //piirretään puretut viivat        
                {                    
                    context.beginPath();
                    context.lineWidth = line[2]; //brushin paksuus
                    context.strokeStyle = line[3]; // brushin väri
                    context.moveTo(line[0].x * width, line[0].y * height);
                    context.lineTo(line[1].x * width, line[1].y * height);
                    context.stroke();
                }
            }
        }            
    }

    function getNameElement (user) 
    {
        var elementId = 'whoisdrawing-' + user;
        var element = document.getElementById(elementId);
        if(element == null) 
        {
          element = document.createElement('div');
          element.id = elementId;
          element.className = 'whoisdrawing';
          //var newContent = document.createTextNode('<b>'+user+'</b>');
          var newContent = document.createElement('li');
          newContent.innerHTML = '<b>'+user+'</b>'; 
          element.appendChild(newContent);
          //$('#'+elementId).html('<b>'+user+'</b>'); 
          // Perhaps you want to attach these elements another parent than document
          document.body.appendChild(element);
          setTimeout(function(){ document.body.removeChild(element); }, 1000);          
        }
        return element;
    }

    var tempArray = [];
    //var recordLine = false;
    function mainLoop() 
    {
        if(!eraser && mouse.click && mouse.move && mouse.pos_prev) // piirretään viiva 
        {
            
            tempArray.push({ line: [ mouse.pos, mouse.pos_prev, size, color]});
            socket.emit('draw', {line: [{ line: [ mouse.pos, mouse.pos_prev, size, color]}], isDrawing: true});
            mouse.move = false;
        }

        else if (!eraser && !mouse.click)
        {
            if (tempArray.length > 0)
            {
                socket.emit('draw', {line: tempArray, isDrawing: false});
                console.log("lähetetään");
            }
            tempArray = [];
        }
        else if (eraser && mouse.click)
        {
            socket.emit("erasertool", { mouse: mouse.pos, mouse2: mouse.pos_prev }); //toimiva			
        }
        mouse.pos_prev = {x: mouse.pos.x, y: mouse.pos.y};
        size = brushSize;
        color = brushColor;

        setTimeout(mainLoop, 25); //kutsuu funktiota uudelleen sekä katkaisee viivaa 25ms välein arrayhyn         
               
    }
    mainLoop();

     //Pyyhkimeen funktioita jotta hiiri osaisi huomata viivan
     function Vec2Cross2 ( x1, y1, x2, y2 )
     {
         return ( x1 * y2 ) - ( y1 * x2 );
     }
 
     function LineToLineIntersection ( x11, y11, x12, y12, x21, y21, x22, y22 )
     {
         //line directional vector
         var d2x = x22 - x21;
         var d2y = y22 - y21;
         // mouse directional vector
         var d1x = x12 - x11;
         var d1y = y12 - y11;
         //mouse directional vector
         var d21x = x21 - x11;
         var d21y = y21 - y11;
         //mouse starting point directional vector to line starting point
         var cV = Vec2Cross2 ( d1x, d1y, d2x, d2y );
         var cV2 = Vec2Cross2 ( d21x, d21y, d2x, d2y );
         var s = ( cV2 * cV ) / ( cV * cV );
         
         if ( s > 0.0 && s <= 1.0 )
         {
             var intersectionX = x11 + d1x * s;
             var intersectionY = y11 + d1y * s;
             var sqr = Math.sqrt ( d2x * d2x + d2y * d2y );
             var intersectionDirectionX = intersectionX - x21;
             var intersectionDirectionY = intersectionY - y21;
             var d = ( d2x / sqr ) * intersectionDirectionX + ( d2y / sqr ) * intersectionDirectionY;
             var length1 = Math.sqrt ( d2x * d2x + d2y * d2y );
             var length2 = Math.sqrt ( ( intersectionX - x21 ) * ( intersectionX - x21 ) + ( intersectionY - y21 ) * ( intersectionY - y21 ) );
 
             if ( length1 < length2 || d < 0.0 )
                 return false;
             else
                 return true;
         }
         
         return false;
     }



});
//canvasin tyhjennysfunktio
function clearit()
{
    socket.emit('clearit', true);
}
//brushsize size: x-div feidaaminen
function fadeOutEffect() 
{
    var fadeTarget = document.getElementById("brushSizediv");
    var fadeEffect = setInterval(function () 
    {
        if (!fadeTarget.style.opacity) {
            fadeTarget.style.opacity = 1;
        }
        if (fadeTarget.style.opacity > 0) {
            fadeTarget.style.opacity -= 0.1;
        } else {
            clearInterval(fadeEffect);
            fadeTarget.style.display = "none";
        }
    }, 200);
}

//piirtotyökaluja
function lessStroke()
{
    if(brushSize > 1  && !thefunBrush)
    {
        brushSize--;   
        //näytetään käyttäjälle hetkellisesti, että mikä koko hänen työkalussaan on tällä hetkellä.
        $('#brushSizediv').html("size: "+ brushSize.toFixed(0) );   
        var fadeTarget = document.getElementById("brushSizediv");
        fadeTarget.style.opacity = 1;
        fadeTarget.style.display = "none";
        fadeTarget.style.display = "block";
        fadeOutEffect();   //piilottaa hitaasti ikkunan.  
    }         
}

function moreStroke()
{
    if(brushSize < 5 && !thefunBrush)
    {
        brushSize++;  
        $('#brushSizediv').html("size: "+ brushSize.toFixed(0));   
        var fadeTarget = document.getElementById("brushSizediv");
        fadeTarget.style.opacity = 1;
        fadeTarget.style.display = "none";
        fadeTarget.style.display = "block";
        fadeOutEffect();    
    }
}

function usePen()
{
    if(thefunBrush)
    {
        if(brushSize.toFixed(0) > 4)
        {
            brushSize=5;
        }
        else if(brushSize.toFixed(0) < 2)
        {
            brushSize=1;
        }
    }
    document.getElementById("funbrushbutton").style.background = "white"; //brush nappula valkoiseksi
    document.getElementById("eraserbutton").style.background = "white"; //eraser nappula valkoiseksi

    document.getElementById("pen").style.background = "rgb(220, 220, 220)"; //default pen nappula tummaksi, koska se on valittu

    eraser = false;  
    thefunBrush = false;
}
function funBrush()
{
    document.getElementById("pen").style.background = "white"; //default pen nappula takaisin valkoseksi
    document.getElementById("eraserbutton").style.background = "white"; //eraser nappula valkoiseksi

    document.getElementById("funbrushbutton").style.background = "rgb(220, 220, 220)"; //brush nappula tummaksi, koska se on valittu

    thefunBrush = true;
    eraser = false;
    fun(); //muutetaan työkaluksi brush
}

function useEraser()
{  
    document.getElementById("pen").style.background = "white"; //default pen nappula takaisin valkoseksi
    document.getElementById("funbrushbutton").style.background = "white"; //brush nappula valkoiseksi

    document.getElementById("eraserbutton").style.background = "rgb(220, 220, 220)"; //eraser nappula tummaksi, koska se on valittu

    eraser = true;
    thefunBrush = false;
}
//värit
function colorBlack() {brushColor='black';}
function colorPurple() {brushColor='purple';}
function colorRed() {brushColor='red';}
function colorGreen() {brushColor='green';}
function colorYellow() {brushColor='yellow';}
function colorBlue() {brushColor='blue';}
function colorGray() {brushColor='gray';}
function colorWhite() {brushColor='white';}

var images = [];
var imageLines = [];
let number = 0;
//sivellin
fun = function() 
{ 
    var d = new Date(); 
    if(thefunBrush)
    {
        //brushSize = (Math.sin(d.getMilliseconds()/100.0)+1)*3; setTimeout(fun, 5);
        //brushSize = (mouse.pos_prev - mouse.pos) / d; setTimeout(fun, 5);
        brushSize = 1 +(Math.sin(d.getMilliseconds()/100.0)+1)*2.5; setTimeout(fun, 5);
    }
};

function saveImg() 
{  
    var canvas = $("#drawing")[0];
    var img = canvas.toDataURL("image/png");     
    var imgLines = JSON.parse(JSON.stringify(clientHistory)); //var imgLines = clientHistory; shallow copy, tehdään sen sijaan JSON.stringyfy ja JSON.parse metodi.
    images.push(img); //lisätään kuva arrayhyn
    imageLines.push(imgLines); //lisätään linearray arrayhyn
    console.log(number);
    addImages(); //päivitetään kuvagalleriassa thumbnailit
    $("#messages").append("<li>" + getCurrentDate() 
    + ' <b>Canvas stored to images.</b><img id="chatImg" src="'+images[number]+'" onclick="openLightbox('+number+')" />'
    + '<a href="'+images[number]+'" download>Download image</a> or <a href="" onclick="loadCanvas('+number+');return false;" >Load to canvas</a></li>');
    number++;
    console.log(number)
    
    setTimeout(function(){ $(".chatMessages").stop().animate({ scrollTop: $(".chatMessages")[0].scrollHeight}, 0); }, 100);
    
}  

function addImages ()
{
    var thumbnails = $('#thumbnails');
    //for loop joka laittaa näkyville kaikki thumbnailit
    var html = '';
    for (i = 0; i < images.length; ++i )
    {
        html += '<li><img id="thumbnail" src="' + images[i] + '" onclick="changeLightbox('+[i]+')" /></li>';
    }
    thumbnails.html(html);
}

document.addEventListener("DOMContentLoaded", function()
{  
   

//suljetaan lightbox
    document.getElementById('invisibleDiv').onclick = function()
    {
        document.getElementById('lightbox').style.display = 'none';
        document.getElementById('invisibleDiv').style.display = 'none';
        document.getElementById('emojibox').style.display = 'none';
        document.getElementById('helpbox').style.display = 'none';
    }
});

//onclick funktio lightboxille
function openLightbox(n)
{
    // var canvas = $("#drawing")[0];
    // var img = canvas.toDataURL("image/png"); 
    var lightbox = document.getElementById("lightbox");
    var invDiv = document.getElementById("invisibleDiv");

    invDiv.style.display= "block";
    lightbox.style.display= "block";    
    if(images && images.length)
    {
        $('#kuva').html('<img src="' + images[n] + '" /><br><a href="'+images[n]+'" download>Download image</a> <a href="" onclick="loadCanvas('+n+');return false;" >Load to canvas</a>');   
    }
    else
    {
        $('#kuva').html("You haven't saved any images of the canvas during this session."); 
    }

}
function changeLightbox(a)
{    
    $('#kuva').html('<img src="' + images[a] + '" /><br><a href="'+images[n]+'" download>Download image</a> <a href="" onclick="loadCanvas('+a+');return false;" >Load to canvas</a>'); 
}
function closeLightbox()
{
    var lightbox = document.getElementById("lightbox");
    var invDiv = document.getElementById("invisibleDiv");

    invDiv.style.display= "none";
    lightbox.style.display= "none";    
}
function closeHelpbox()
{
    var helpbox = document.getElementById("helpbox");
    var invDiv = document.getElementById("invisibleDiv");

    invDiv.style.display= "none";
    helpbox.style.display= "none";    
}

function loadCanvas(u)
{
    //Lähetetään valittu kuva serverille
    socket.emit('send canvas', {imagearray: imageLines[u]});
    //suljetaan vielä kuvagalleria
    closeLightbox();
}
