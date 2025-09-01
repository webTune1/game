// cars.js - HD Vector Art Car Definitions for Test Drive

// All cars: { name, type, draw(ctx, x, y, w, h, options) }
// Main player car is first in array.

const CAR_MODELS = [
  // Main Player Car (Sport)
  {
    name: "SuperSport",
    type: "player",
    draw(ctx, x, y, w, h, opt={}) {
      ctx.save();
      // Shadow
      ctx.beginPath();
      ctx.ellipse(x+w/2, y+h*0.88, w*0.39, h*0.10, 0, 0, 2*Math.PI);
      ctx.globalAlpha = 0.32;
      ctx.fillStyle = "#222";
      ctx.fill();
      ctx.globalAlpha = 1.0;
      // Body
      ctx.beginPath();
      ctx.moveTo(x+0.17*w, y+0.90*h);
      ctx.lineTo(x+0.83*w, y+0.90*h);
      ctx.lineTo(x+0.93*w, y+0.18*h);
      ctx.lineTo(x+0.5*w+0.27*w, y+0.07*h);
      ctx.lineTo(x+0.5*w-0.27*w, y+0.07*h);
      ctx.lineTo(x+0.07*w, y+0.18*h);
      ctx.closePath();
      ctx.fillStyle = "#e74c3c";
      ctx.shadowColor = "#a82d2d";
      ctx.shadowBlur = 10;
      ctx.fill();
      ctx.shadowBlur = 0;
      // Stripe
      ctx.save();
      ctx.globalAlpha = 0
