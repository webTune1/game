// cars.js - car/bike vector art, colors, attributes for Test Drive

// Each car/bike: { name, type, color, details, headlights, shadow, draw(ctx, x, y, w, h, options) }
const CAR_MODELS = [
  // Level 1 - sporty red
  {
    name: "Sportster", type: "car", color: "#e74c3c", details: "#c43b2b", headlights: "#fff", shadow: "#a82d2d",
    draw(ctx, x, y, w, h, opt={}) {
      // 2.5D: top/front bias, shadow
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(x+w/2, y+h*0.72, w*0.44, h*0.19, 0, 0, 2*Math.PI);
      ctx.fillStyle = opt.shadow || this.shadow; ctx.globalAlpha = 0.33;
      ctx.fill(); ctx.globalAlpha = 1.0;
      // Body
      ctx.beginPath();
      ctx.moveTo(x+0.14*w, y+0.82*h);
      ctx.lineTo(x+0.86*w, y+0.82*h);
      ctx.lineTo(x+0.92*w, y+0.18*h);
      ctx.lineTo(x+0.5*w+0.26*w, y+0.08*h);
      ctx.lineTo(x+0.5*w-0.26*w, y+0.08*h);
      ctx.lineTo(x+0.08*w, y+0.18*h);
      ctx.closePath();
      ctx.fillStyle = opt.color || this.color;
      ctx.shadowColor = opt.shadow || this.shadow;
      ctx.shadowBlur = 10;
      ctx.fill();
      ctx.shadowBlur = 0;
      // Window
      ctx.fillStyle = "#fff5";
      ctx.fillRect(x+0.21*w, y+0.16*h, 0.58*w, 0.17*h);
      // Headlights (at night)
      if(opt.headlights){
        ctx.save();
        ctx.globalAlpha = 0.44 + 0.22*Math.sin(performance.now()/300);
        ctx.strokeStyle = "#fff8";
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(x+0.23*w, y+0.14*h);
        ctx.lineTo(x+0.23*w-18, y+0.03*h);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x+0.77*w, y+0.14*h);
        ctx.lineTo(x+0.77*w+18, y+0.03*h);
        ctx.stroke();
        ctx.restore();
      }
      ctx.restore();
    }
  },
  // Level 2 - blue coupe
  {
    name: "Coupe", type: "car", color: "#4da3ff", details: "#1f5fa3", headlights: "#fff", shadow: "#26436d",
    draw(ctx, x, y, w, h, opt={}) {
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(x+w/2, y+h*0.72, w*0.44, h*0.19, 0, 0, 2*Math.PI);
      ctx.fillStyle = opt.shadow || this.shadow; ctx.globalAlpha = 0.33;
      ctx.fill(); ctx.globalAlpha = 1.0;
      ctx.beginPath();
      ctx.moveTo(x+0.13*w, y+0.84*h);
      ctx.lineTo(x+0.87*w, y+0.84*h);
      ctx.lineTo(x+0.92*w, y+0.18*h);
      ctx.lineTo(x+0.5*w+0.22*w, y+0.07*h);
      ctx.lineTo(x+0.5*w-0.22*w, y+0.07*h);
      ctx.lineTo(x+0.08*w, y+0.18*h);
      ctx.closePath();
      ctx.fillStyle = opt.color || this.color;
      ctx.shadowColor = opt.shadow || this.shadow;
      ctx.shadowBlur = 8;
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = "#fff6";
      ctx.fillRect(x+0.25*w, y+0.17*h, 0.50*w, 0.17*h);
      if(opt.headlights){
        ctx.save();
        ctx.globalAlpha = 0.43 + 0.21*Math.sin(performance.now()/288);
        ctx.strokeStyle = "#fff8";
        ctx.lineWidth = 7;
        ctx.beginPath();
        ctx.moveTo(x+0.22*w, y+0.19*h);
        ctx.lineTo(x+0.22*w-17, y+0.01*h);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x+0.78*w, y+0.19*h);
        ctx.lineTo(x+0.78*w+17, y+0.01*h);
        ctx.stroke();
        ctx.restore();
      }
      ctx.restore();
    }
  },
  // Level 3 - green hatchback
  {
    name: "Hatchback", type: "car", color: "#3beb70", details: "#1f7e34", headlights: "#fff", shadow: "#327d51",
    draw(ctx, x, y, w, h, opt={}) {
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(x+w/2, y+h*0.75, w*0.43, h*0.16, 0, 0, 2*Math.PI);
      ctx.fillStyle = opt.shadow || this.shadow; ctx.globalAlpha = 0.32;
      ctx.fill(); ctx.globalAlpha = 1.0;
      ctx.beginPath();
      ctx.moveTo(x+0.14*w, y+0.85*h);
      ctx.lineTo(x+0.86*w, y+0.85*h);
      ctx.lineTo(x+0.93*w, y+0.20*h);
      ctx.lineTo(x+0.5*w+0.22*w, y+0.08*h);
      ctx.lineTo(x+0.5*w-0.22*w, y+0.08*h);
      ctx.lineTo(x+0.07*w, y+0.20*h);
      ctx.closePath();
      ctx.fillStyle = opt.color || this.color;
      ctx.shadowColor = opt.shadow || this.shadow;
      ctx.shadowBlur = 9;
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = "#fff7";
      ctx.fillRect(x+0.28*w, y+0.18*h, 0.45*w, 0.15*h);
      if(opt.headlights){
        ctx.save();
        ctx.globalAlpha = 0.41 + 0.18*Math.sin(performance.now()/270);
        ctx.strokeStyle = "#fff8";
        ctx.lineWidth = 7;
        ctx.beginPath();
        ctx.moveTo(x+0.23*w, y+0.19*h);
        ctx.lineTo(x+0.23*w-16, y+0.01*h);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x+0.77*w, y+0.19*h);
        ctx.lineTo(x+0.77*w+16, y+0.01*h);
        ctx.stroke();
        ctx.restore();
      }
      ctx.restore();
    }
  },
  // Level 4 - purple muscle
  {
    name: "Muscle", type: "car", color: "#b14cff", details: "#773b99", headlights: "#fff", shadow: "#5a277a",
    draw(ctx, x, y, w, h, opt={}) {
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(x+w/2, y+h*0.75, w*0.45, h*0.17, 0, 0, 2*Math.PI);
      ctx.fillStyle = opt.shadow || this.shadow; ctx.globalAlpha = 0.32;
      ctx.fill(); ctx.globalAlpha = 1.0;
      ctx.beginPath();
      ctx.moveTo(x+0.13*w, y+0.81*h);
      ctx.lineTo(x+0.87*w, y+0.81*h);
      ctx.lineTo(x+0.92*w, y+0.18*h);
      ctx.lineTo(x+0.5*w+0.27*w, y+0.09*h);
      ctx.lineTo(x+0.5*w-0.27*w, y+0.09*h);
      ctx.lineTo(x+0.08*w, y+0.18*h);
      ctx.closePath();
      ctx.fillStyle = opt.color || this.color;
      ctx.shadowColor = opt.shadow || this.shadow;
      ctx.shadowBlur = 9;
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = "#fff6";
      ctx.fillRect(x+0.23*w, y+0.18*h, 0.54*w, 0.15*h);
      if(opt.headlights){
        ctx.save();
        ctx.globalAlpha = 0.43 + 0.2*Math.sin(performance.now()/280);
        ctx.strokeStyle = "#fff8";
        ctx.lineWidth = 8;
        ctx.beginPath();
        ctx.moveTo(x+0.21*w, y+0.17*h);
        ctx.lineTo(x+0.21*w-17, y+0.01*h);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x+0.79*w, y+0.17*h);
        ctx.lineTo(x+0.79*w+17, y+0.01*h);
        ctx.stroke();
        ctx.restore();
      }
      ctx.restore();
    }
  },
  // Level 5 - orange bike
  {
    name: "Superbike", type: "bike", color: "#ff902b", details: "#b85d1b", headlights: "#fff", shadow: "#7b4c1a",
    draw(ctx, x, y, w, h, opt={}) {
      // Draw bike: two wheels, "body", fake 3d
      ctx.save();
      // Wheels
      ctx.beginPath();
      ctx.ellipse(x+w*0.30, y+h*0.87, w*0.13, h*0.06, -0.22, 0, 2*Math.PI);
      ctx.ellipse(x+w*0.68, y+h*0.87, w*0.13, h*0.06, 0.22, 0, 2*Math.PI);
      ctx.fillStyle = "#222";
      ctx.fill();
      // Body main
      ctx.beginPath();
      ctx.moveTo(x+0.31*w, y+0.78*h);
      ctx.lineTo(x+0.69*w, y+0.78*h); // seat
      ctx.lineTo(x+0.84*w, y+0.16*h);
      ctx.lineTo(x+0.50*w, y+0.05*h);
      ctx.lineTo(x+0.16*w, y+0.16*h);
      ctx.closePath();
      ctx.fillStyle = opt.color || this.color;
      ctx.shadowColor = opt.shadow || this.shadow;
      ctx.shadowBlur = 8;
      ctx.fill();
      ctx.shadowBlur = 0;
      // Headlight cone
      if(opt.headlights){
        ctx.save();
        ctx.globalAlpha = 0.22 + 0.13*Math.sin(performance.now()/200);
        ctx.strokeStyle = "#fff8";
        ctx.lineWidth = 7;
        ctx.beginPath();
        ctx.moveTo(x+0.50*w, y+0.05*h);
        ctx.lineTo(x+0.50*w-14, y-0.06*h);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x+0.50*w, y+0.05*h);
        ctx.lineTo(x+0.50*w+14, y-0.06*h);
        ctx.stroke();
        ctx.restore();
      }
      ctx.restore();
    }
  }
  // ... add more cars/bikes for higher levels!
];

// Level info: array of { name, color, carIndex, speedMul, ... }
const LEVELS = [
  { name: "Start", car: 0, speed: 1.0 },
  { name: "City Day", car: 1, speed: 1.11 },
  { name: "Green Run", car: 2, speed: 1.23 },
  { name: "Purple Rush", car: 3, speed: 1.37 },
  { name: "Bike Night", car: 4, speed: 1.47 },
  // ... add up to 10+ levels
];

// Export
window.CAR_MODELS = CAR_MODELS;
window.LEVELS = LEVELS;
