//täällä tehdään piirtokommunikointi serverin kanssa
var eraser = false; //pyyhin
var brushSize = 1;
var brushColor = 'black';  

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
        resize();
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

    //update clientcanvas
    socket.on('get linearray', function(data)
    {
        console.log("canvas tuotu");
        var lineHistory = data.linehistory;   
        for (var i in lineHistory) 
        {   
            for (var a in lineHistory[i]) 
            {
                var line = lineHistory[i][a].line;  
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
    socket.on('draw bufferarray', function(data)
    {
        console.log("bufferarray tuotu");
        var bufferHistory = data.bufferarray;
        console.log(bufferHistory);
        //data.line[i].line 
        for (var i in bufferHistory)
        {

                var line = bufferHistory[i].line;
                //piirretään puretut viivat
                 {                    
                    context.beginPath();
                    context.lineWidth = line[2]; //brushin paksuus
                    context.strokeStyle = line[3]; // brushin väri
                    context.moveTo(line[0].x * width, line[0].y * height);
                    context.lineTo(line[1].x * width, line[1].y * height);
                    context.stroke();
                    //näytetään piirtäessä piirtäjän userrname
                    if(bufferHistory[i].user)
                    {                   
                        var whoIsdrawing = getNameElement(bufferHistory[i].user);
                        whoIsdrawing.style.display = "block";                
                        whoIsdrawing.style.left = line[1].x*width;
                        whoIsdrawing.style.top = line[1].y*height;  
                    }     
                }
            
        }
    });

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
        console.log("client clearit");
    });

    //otetaan vastaan server.js lähettämä data piirroksesta TÄMÄ ON MAHDOLLISESTI TURHA, KOSKA BUFFERARRAY TUO NYT PIIRTÄMISEN
    socket.on('draw line', function(data) //testaa täällä detect line ja mouse coords
    {   
        var line = data.line;        
        {
            context.beginPath();
            context.lineWidth = line[2]; //brushin paksuus
            context.strokeStyle = line[3]; // brushin väri
            context.moveTo(line[0].x * width, line[0].y * height);
            context.lineTo(line[1].x * width, line[1].y * height);
            context.stroke();
            //näytetään piirtäessä piirtäjän username
            if(data.user)
            {                   
                var whoIsdrawing = getNameElement(data.user);
                whoIsdrawing.style.display = "block";                
                whoIsdrawing.style.left = line[1].x*width;
                whoIsdrawing.style.top = line[1].y*height;  
            }            

        }

    });

    function getNameElement (user) 
    {
        var elementId = 'whoisdrawing-' + user;
        var element = document.getElementById(elementId);
        if(element == null) 
        {
          element = document.createElement('div');
          element.id = elementId;
          element.className = 'whoisdrawing';
          var newContent = document.createTextNode(user);
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
            socket.emit('draw fake', { line: [ mouse.pos, mouse.pos_prev, size, color]}); //alkuperänen
            //socket.emit('draw fake', { line:{line: [ mouse.pos, mouse.pos_prev, size, color]}}); //tämän kanssa server for loop testailuja varten.
            mouse.move = false;
            tempArray.push({ line: [ mouse.pos, mouse.pos_prev, size, color]});
        }

        else if (!eraser && !mouse.click)
        {
            if (tempArray.length > 0)
            {
                socket.emit('draw line', {line: tempArray});
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

});
//canvasin tyhjennysfunktio
function clearit()
{
    socket.emit('clearit', true);
}

//kuvan tuominen uudelleen canvasiin jos selaimen ikkunan kokoa muutetaan
function resize()
{
    socket.emit('resize');
}

  
//piirtotyökaluja
function lessStroke()
{
    if(brushSize > 1)
    {
        brushSize--;        
    }
}

function moreStroke()
{
    if(brushSize < 5)
    {
        brushSize++;      
    }
}

function useBrush()
{
    eraser = false;   
    lineTool = false;
}

function useEraser()
{  
    eraser = true;
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
let number = 0;

function saveImg() 
{  
    var canvas = $("#drawing")[0];
    var img = canvas.toDataURL("image/png"); 
    images.push(img); //lisätään kuva arrayhyn
    console.log(number);
    addImages(); //päivitetään kuvagalleriassa thumbnailit
    $("#messages").append("<li>" + getCurrentDate() 
    + ' <b>Canvas stored to images.</b><img id="chatImg" src="'+images[number]+'" onclick="openLightbox('+number+')" />'
    + '<a href="'+images[number]+'" download>Download image</a></li>');
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
        $('#kuva').html('<img src="' + images[n] + '" /><br><a href="'+images[n]+'" download>Download image</a>');   
    }
    else
    {
        $('#kuva').html("You haven't saved any images of the canvas during this session."); 
    }

}
function changeLightbox(a)
{    
    $('#kuva').html('<img src="' + images[a] + '" />'); 
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

