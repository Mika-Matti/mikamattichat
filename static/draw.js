//täällä tehdään piirtokommunikointi serverin kanssa

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

    // //pyyhin
    // socket.on('eraser', function(data)
    // {
    //     var line = data.line;
    //     if(mouse.click && mouse.over && eraser)

    // });
    //tyhjentää canvasin
    socket.on('clearit', function()
    {
        context.clearRect(0, 0, width, height);
        console.log("client clearit");
    });
    //otetaan vastaan server.js lähettämä data piirroksesta
    socket.on('draw_line', function(data) 
    {
        var line = data.line;
        context.beginPath();
       // context.lineWidth = 2;
        context.moveTo(line[0].x * width, line[0].y * height);
        context.lineTo(line[1].x * width, line[1].y * height);
        context.stroke();
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


