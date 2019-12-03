const ControllerAPI = require("../dist");
const DualshockLikeController = ControllerAPI.DualshockLikeController;

let controller = new DualshockLikeController(0).startWatching();

controller.onOpenClose.subscribe((value)=>{
    if (value){
        console.log("controller is open!")
    }
})
controller.onDualshockData.subscribe((value)=>{
    console.log("Got new data!");
    console.log(value)
})