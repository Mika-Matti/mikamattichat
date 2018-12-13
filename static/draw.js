//täällä tehdään piirtokommunikointi serverin kanssa
var eraser = false; //pyyhin
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
        mouse.pos.x = ( e.clientX -2 ) / width;  // -10
        mouse.pos.y = ( e.clientY -42 ) / height; // -50 miinustaa ylläolevan headerin canvasista
        mouse.move = true;
        //alert("toimii");
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
    //pyyhin työkalu
   
    //  socket.on('erasertool', function(data)
    //  {
    //      console.log("test");
    //     if( mouse.pos.x === data.line[0].x * width && mouse.pos.y === data.line[0].y * height)
    //     {
    //         alert("Hiiri osui viivaan");
    //     }

    //  });


    socket.on('clearit', function()
    {
        context.clearRect(0, 0, width, height);
        console.log("client clearit");
    });
    //otetaan vastaan server.js lähettämä data piirroksesta
    socket.on('draw_line', function(data) //testaa täällä detect line ja mouse coords
    {
        var line = data.line;
      //  if(!eraser)
        {
        context.beginPath();
       // context.lineWidth = 2;
        context.moveTo(line[0].x * width, line[0].y * height);
        context.lineTo(line[1].x * width, line[1].y * height);
        context.stroke();
        }
        // else
        // {
        //     console.log("test");
        //     if( mouse.pos.x === line[0].x * width && mouse.pos.y === line[0].y * height)
        //     {
        //         alert("Hiiri osui viivaan");
        //     }
        // }
    });

    //itse funktio joka katsoo piirretäänkö 25ms väelin
    function mainLoop() 
    {
        if(mouse.click && mouse.move && mouse.pos_prev) // piirretään viiva 
        {
            socket.emit('draw_line', { line: [ mouse.pos, mouse.pos_prev ] });
            mouse.move = false;
        }
        mouse.pos_prev = {x: mouse.pos.x, y: mouse.pos.y};
        setTimeout(mainLoop, 25); //katkaistaan viiva 25ms välein arrayhyn
      
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
    //linewidth int ++
}

function moreStroke()
{
    //linewidth int --
}

function brushColor()
{
    eraser = false;
   
}

function useEraser()
{
  
    eraser = true;

}

