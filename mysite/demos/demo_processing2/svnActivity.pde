void setup() {
    // Fetch data from XML
    int   firstDate = 2012  *12 + 0;
    int   lastDate  = year()*12 + month()-1;
    int   nb        = lastDate-firstDate+1;
    int[] bars      = new int[nb];
    XML   log       = loadXML("demo_processing2/mrv5Log.xml");
    XML[] entries   = log.getChildren("logentry/date");
    for (int i = 0; i < entries.length; i++) {
      int year  = int(entries[i].getContent().substring(0,4));
      int month = int(entries[i].getContent().substring(5,7));
      int date  = year*12+month-1;
      bars[date-firstDate]+=1;
    }
    // Plot data
    size(400,200);
    int   radius = 5; // size of dots
    int   margin = 20; // border width
    float stepx  = (width-2*margin)/nb; // x grid
    float stepy  = radius*0.7;          // y grid
    background(120,140,160);
    noStroke();
    fill(180);
    rect(margin,margin,width-2*margin,height-2*margin);
    for (int i=0; i< bars.length; i++) { 
      int x=int( margin+(i+0.5)*stepx );
      for (int j=0; j< bars[i]; j++) {
        int y=int( height-j*(stepy)-margin );
        fill(70,110,160);
        ellipse(x,y,2*radius,radius); // bar stacking
      }
      fill(0);
      ellipse(x,height-margin,radius,radius); // x axis grid
      textSize(10);
      textAlign(CENTER,CENTER);
      if(bars[i]>0) { text(bars[i],x,2*margin); } // Display numbers
      if((i+firstDate)%12==0) {
        int year = ((i+firstDate)-(i+firstDate)%12)/12;
        text("Jan"+year,x,height-0.5*margin); // x axis labels
      }
    }
    textSize(margin);
    textAlign(LEFT,TOP);
    text("Proj commits",margin*1.1,margin*1.1); // Title
}

