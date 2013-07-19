// Declare variables that need to be seen both in setup and draw here
int   nb     = 15; // nb points on curve
int   radius = 10; // size of dots in curve
int   margin = 10; // border width 
int[] vals;        // array of values to be plotteds
int   step;        // x-dimension grid

// Setup is the function that is called once at t0 run time
void setup() {
    size(400,200);
    background(100);
    noStroke();
    fill(150);
    rect(margin,margin,width-2*margin,height-2*margin);
    vals = new int [nb];
    for (int i=0; i< vals.length; i++) { vals[i] = 0;}  
    step = (width-2*margin)/nb;
  }

// draw is the function that is called endlessly at 60 fps
void draw() {  
    // Clear previous plot
    noStroke(); 
    fill(150);
    rect(margin,margin,width-2*margin,height-2*margin);
    
    // Compute curve : shift points and get a new one
    for (int i=0; i< vals.length; i++) { 
      if (i==vals.length-1) { vals[i]=mouseY;}
      else                  { vals[i] = vals[i+1];}
      }

    // Plot curve  
    stroke(0);
    for (int i=0; i< vals.length; i++) {
      fill(i*10);
      float x = margin+step*(i+0.5);
      float y = margin+radius+(height-2*(margin+radius))*vals[i]/height;
      ellipse(x,y,radius,radius);
      }   
  }
