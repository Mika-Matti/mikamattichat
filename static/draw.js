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

   // var down = function(el) {    var canvas  = document.getElementById('drawing');   var image = canvas.toDataURL("image/jpg");      el.href = image;    };


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

    //otetaan vastaan server.js lähettämä data piirroksesta
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
        }
    });

    var tempArray = [];
    //var recordLine = false;
    function mainLoop() 
    {
        if(!eraser && mouse.click && mouse.move && mouse.pos_prev) // piirretään viiva 
        {
            socket.emit('draw fake', { line: [ mouse.pos, mouse.pos_prev, size, color]});
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
            //socket.emit("erasertool", { mouseX: mouse.pos.x, mouseY: mouse.pos.y, size: size, width: width, height: height });
			
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
    + ' <b>Canvas was stored as an image.</b><img id="chatImg" src="'+images[number]+'" onclick="openLightbox('+number+')" />'
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

    $('#kuva').html('<img src="' + images[n] + '" />');    

}
function changeLightbox(a)
{    
    $('#kuva').html('<img src="' + images[a] + '" />'); 
}

