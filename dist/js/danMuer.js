(function(window,Math,undefined){

const loop = Symbol("loop");
const init = Symbol("init"); 		//初始化
const requestAnimationFrame = window.requestAnimationFrame || window.webkitRequestAnimationFrame;
//es6
class normalDM{
	constructor(cv,opts = {}){

		this.save = [];
		this.canvas = cv;
		this.cxt = cv.getContext('2d');

		this.width = 0;
		this.height = 0;
		
		this.rows = {
			slide : [],
			top : [],
			bottom : []
		}; //存放不同类型弹幕的通道数
		this.filters = [];

		this.leftTime = opts.leftTime || 2000;  //头部、底部静止型弹幕的是显示时长
		this.space = opts.space || 10;  		//弹幕的行距
		this.unitHeight = 0; 					//弹幕的高度
		this.rowNum = 0;						//通道行数


		this.startIndex = 0;		//循环时的初始下标
		this.looped = false;		//是否已经经历过一次循环

		this.fps = document.querySelector(".fps");

		this.changeStyle(opts);
	}

	//添加弹幕
	add(obj){
		if(!obj) return;

		//如果已经可以计算文本宽度，则直接进行计算
		if(this.looped)
		this.countWidth([obj]);

		this.filter(obj);

		this.save.push(obj);
	}

	//清除所有弹幕
	clear(){
		this.save = [];
		this.startIndex = 0;
	}

	//暂停
	pause(){
		this.paused = true;
	}

	//播放
	run(){
		this.paused = false;
	}

	//添加过滤
	addFilter(key,val){
		if(!key || !val) return false;
		
		this.filters.push({
			"key" : key,
			"value" : val
		});
	}

	//过滤
	filter(obj){
		let filters = this.filters;
		for( let res of filters ){
			if( obj[res.key].includes(res.value) ){
				obj.hide = true;
				return false;
			}
		}

	}

	//清屏
	clearRect(){
		this.cxt.clearRect(0,0,this.width,this.height);
	}

	//合并字体
	font(){
		this.globalFont = this.globalStyle + 
					" " + this.globalWeight + 
					" " + this.globalSize + 
					" " + this.globalFamily;
	}

	//改变全局样式
	changeStyle(opts = {}){
		
		//文本属性保存
		this.globalSize = opts.fontSize || this.globalSize || "24px";   //字体大小
		this.globalFamily = opts.fontFamily || this.globalFamily || "微软雅黑"; //字体
		this.globalStyle = opts.fontStyle || this.globalStyle || "normal"; //字体样式
		this.globalWeight = opts.fontWeight || this.globalWeight || "normal"; //字体粗细
		this.globalColor = opts.fontColor || this.globalColor || "#66ccff"; //字体颜色

		//表示进行过一次全局样式变化
		this.globalChanged = true;
	}

	//启用全局样式
	initStyle(cxt){

		this.globalChanged = false;

		//合并font属性
		this.font();

		//更新全局样式
		cxt.font = this.globalFont;
		cxt.textBaseline = "middle";
		cxt.fillStyle = this.globalColor;

	}

	//循环
	update(w,h,time){
		this.fps.innerHTML = 1000 / time >> 0;

		let [items,cxt] = [this.save,this.cxt];

		this.globalChanged && this.initStyle(cxt); //初始化全局样式

		!this.looped && this.countWidth(items); //计算文本宽度以及初始化位置（只执行一次）

		if( this.paused ) return false; //暂停

		this.refresh(items); //更新初始下标startIndex

		let [i,item] = [this.startIndex];

		cxt.clearRect(0,0,w,h);

		for(  ; item = items[i++]; ){
			this.step(item,time);
			this.draw(item,cxt);
			this.recovery(item,w);
		}

	}

	//重置弹幕
	reset(resetIndex = 0){

		//resetIndex表示想要开始重置的弹幕的下标，系统想重置该值以后的弹幕
		let [items, w, leftTime, i, item] = [this.save, this.width, this.leftTime, resetIndex];

		for( ; item = items[i++]; ){
			if(item.type == "slide"){
				item.x = w;
				item.rowRid = false;
			} else {
				item.leftTime = leftTime
			}
			item.recovery = false;
		}
		this.startIndex = resetIndex;
	}

	//更新canvas size
	getSize(){

		this.width = this.canvas.width;
		this.height = this.canvas.height;

		this.speedScale = this.width / 600;

		this.deleteRow();
		this.countRows();

		this.globalChanged = true;
	}

	//消除item的row
	deleteRow(){
		let [items,i,item] = [this.save,0];
		for( ; item = items[i++]; ){
			item.row = null;
		}
	}

	//生成通道行
	countRows(){

		//保存临时变量
		let unitHeight = parseInt(this.globalSize) + this.space;
		let [rowNum , rows] = [
			( ( this.height - 20 ) / unitHeight ) >> 0,
			this.rows
		];

		//重置通道
		for( let key of Object.keys(rows) ){
			rows[key] = [];
		}

		//重新生成通道
		for( let i = 0 ; i < rowNum; i++ ){
			let obj = {
				y : unitHeight * i + 20
			};
			rows.slide.push(obj);

			i >= rowNum / 2 ? rows.bottom.push(obj) : rows.top.push(obj);
		}

		//更新实例属性
		this.unitHeight = unitHeight;
		this.rowNum = rowNum;
	}

	//获取通道
	getRow(item){
		
		//如果该弹幕正在显示中，则返回其现有通道
		if( item.row ) 
		return item.row;

		//获取新通道
		const [rows,type] = [this.rows,item.type];
		const row = ( type != "bottom" ? rows[type].shift() : rows[type].pop() );
		//生成临时通道
		const tempRow = this["getRow_"+type]();

		//返回分配的通道
		return row || tempRow;

	}

	getRow_bottom(){
		return {
			y : 20 + this.unitHeight * ( ( Math.random() * this.rowNum / 2 + this.rowNum / 2 ) << 0 ),
			speedChange : false,
			tempItem : true
		};
	}

	getRow_slide(){
		return {
			y : 20 + this.unitHeight * ( ( Math.random() * this.rowNum ) << 0 ),
			speedChange : true,
			tempItem : true
		};
	}

	getRow_top(){
		return {
			y : 20 + this.unitHeight * ( ( Math.random() * this.rowNum / 2 ) << 0 ),
			speedChange : false,
			tempItem : true
		};
	}

	//计算宽度
	countWidth(items,cxt = this.cxt){

		this.looped = true;

		let [ cw , i , item ] = [this.width, 0];

		for( ; item = items[i++]; ){
			let w = cxt.measureText(item.text).width >> 0;
			item.width = w;
			//更新初始 x
			item.x = cw + (Math.random() * 30 >> 0);
			item.speed = 2;
			if(item.type != "slide"){
				item.x = (cw - w ) / 2;
				item.leftTime = this.leftTime;
				item.speed = 0;
			}
			
		}

	}

	//更新每个弹幕的单独样式
	updateStyle(item,cxt){
		cxt.font = this.globalStyle + 
					" " + this.globalWeight + 
					" " + item.globalSize + 
					" " + this.globalFamily;
		cxt.fillStyle = item.color || this.globalColor;
	}

	//计算
	step(item,time){

		let row = this.getRow(item); //取得通道

		//如果通道已满，则新弹幕变更速度防止弹幕重叠
		if(row.speedChange){
			row.speedChange = false;
			item.speed += ( ( Math.random() * 2 + 1 ) >> 0 );
		}

		let speed = (( item.speed * this.speedScale * time / 16 ) >> 0);

		//更新参数
		item.leftTime ? item.leftTime -= time : "";
		item.x -= speed;
		item.y = item.y || row.y;
		item.row = row;
	}

	//绘制
	draw(item,cxt){
		//如果已经显示完成，则不显示
		if(item.recovery || item.hide) 
		return false;

		cxt.save();
		if( item.change ) {
			this.updateStyle(item,cxt);
		}
		cxt.fillText(item.text,item.x,item.y);
		cxt.restore();

	}

	//回收弹幕和通道
	recovery(item,w){
		
		if( item.type == "slide" ){
			item.recovery = this.recoverySlide(item,w);
			return false;
		}
		
		item.recovery = this.recoveryStatic(item);
	}

	recoverySlide(item,w){

		//回收slide类型
		let [x,iw] = [item.x, item.width];

		if( !item.rowRid && x + iw < w && !item.row.tempItem){
			this.rows[item.type].unshift(item.row);
			item.rowRid = true; //表明该行已被释放
		}

		if( x > - iw)
		return false;

		return true;
	}

	recoveryStatic(item){
		if(item.leftTime > 0 )
		return false;

		let type = item.type;

		if(!item.row.tempItem){
			this.rows[type].unshift(item.row);
			item.row = null;
		}

		return true;
	}

	//更新下标
	refresh(items){
		let [i,item,rows] = [this.startIndex,,this.rows];
		//通道排序
		for( let key of Object.keys(rows) ){
			rows[key].sort(function(a,b){
				return a.y - b.y;
			});
		}

		for( ; item = items[i++]; ){
			if(!item.recovery) return false;
			this.startIndex = i;
			item.row = null;
		}
	}

}

//特效弹幕
class effectDM{

	constructor( cv, opts = {}){

		this.canvas = cv;
		this.cxt = cv.getContext("2d");
		this.enable = opts.enable || true;

		this.startIndex = 0;

		this.save = [];
	}

	//添加数据
	add(data){
		if(!data || typeof data != "object" )
		return false;

		let [steps,i,step] = [data.steps,0]

		for( ; step = steps[i++]; ){
			this.initStep(step); //初始化参数
		}

		this.save.push(data);
	}

	//清除数据
	clear(){
		this.save = [];
		this.startIndex = 0;
	}

	//重置弹幕
	reset(i){
		let [items,item] = [this.save];
		for( ; item = items[i++]; ){
			item.hide = false;
		}
	}

	//暂停
	pause(){
		this.paused = true;
	}

	//继续
	run(){
		this.paused = false;
	}

	//启用
	enableEffect(){
		this.enable = true;
	}

	//停用
	disableEffect(){
		this.enable = false;
	}

	//初始化参数
	initStep(step){
		step.scaleStartX = step.scaleStartX || 1;
		step.scaleStartY = step.scaleStartY || 1;
		step.scaleEndX = step.scaleEndX  || 1;
		step.scaleEndY = step.scaleEndY  || 1;
		step.rotateEnd = step.rotateEnd || 0;
		step.rotateStart = step.rotateStart || 0;
		step.endX = step.endX || 0;
		step.startX = step.startX || 0;
		step.endY = step.endY || 0;
		step.startY = step.startY || 0;
		step.skewStartX = step.skewStartX || 0;
		step.skewStartY = step.skewStartY || 0;
		step.skewEndX = step.skewEndX || 0;
		step.skewEndY = step.skewEndY || 0;
		step.pastTime = step.pastTime || 0;
		step.duration = step.duration || 0;
		step.scaleDistX = step.scaleEndX - step.scaleStartX;
		step.scaleDistY = step.scaleEndY - step.scaleStartY;
		step.rotateDist = step.rotateEnd - step.rotateStart;
		//判断多边形
		step.distX = step.points ? ( step.distX || 0 ) : step.endX - step.startX;
		step.distY = step.points ? ( step.distY || 0 ) : step.endY - step.startY;
		step.skewDistX = step.skewEndX - step.skewStartX;
		step.skewDistY = step.skewEndY - step.skewStartY;

	}

	//更新canvas尺寸
	getSize(){

		this.width = this.canvas.width;
		this.height = this.canvas.height;

	}

	//清除画布
	clearRect(){
		this.cxt.clearRect(0,0,this.width,this.height);
	}

	//动画循环
	update(w,h,time){

		if(this.paused) //如果暂停，return
		return false;
		
		let [canvas,cxt] = [this.canvas,this.cxt];
		cxt.clearRect(0,0,w,h);

		if(!this.enable) //如果不启用, return
		return false;

		let [i,items,item] = [this.startIndex,this.save];

		for( ; item = items[i++]; ){
			if( item.hide )
			continue;

			let steps = item.steps;
			let stepItem = steps[item.currentIndex];
			this.step(item,stepItem,time);
			this.draw(item,stepItem,cxt);
			this.recovery(item,stepItem);
		}

	}

	step(item,stepItem,time){

		stepItem.pastTime += time;

		let [type,past,duration] = [stepItem.type || "linear",stepItem.pastTime,stepItem.duration];

		//多边形特殊处理
		if(item.type == "polygon" )
		this.stepCheckPolygon(stepItem,item);

		stepItem.x = this.Tween(type, past, stepItem.startX, stepItem.distX, duration);
		stepItem.y = this.Tween(type, past, stepItem.startY, stepItem.distY, duration);
		stepItem.scaleX = this.Tween(type, past, stepItem.scaleStartX, stepItem.scaleDistX, duration );
		stepItem.scaleY = this.Tween(type, past, stepItem.scaleStartY, stepItem.scaleDistY, duration );
		stepItem.rotate = this.Tween(type, past, stepItem.rotateStart, stepItem.rotateDist, duration );
		stepItem.skewX = this.Tween(type, past, stepItem.skewStartX, stepItem.skewDistX, duration );
		stepItem.skewY = this.Tween(type, past, stepItem.skewStartY, stepItem.skewDistY, duration);

	}
	//多边形特殊设置
	stepCheckPolygon(stepItem,item){
		let currentIndex = item.currentIndex;

		//初始化进行计算
		if( currentIndex == 0){
			let [tempX,tempY,points,len] = [0, 0, stepItem.points.concat([]) || [],0];
			let [i,point] = [0];
			for( ; point = points[i++]; ){
				tempX += point.x;
				tempY += point.y;
				len++;
			}
			if(len <= 0) return false;
			stepItem.startX = tempX / len; //计算中心点
			stepItem.startY = tempY / len;
			stepItem.firstPoint = stepItem.points.concat([]).shift(); //获取moveTo的第一个点
		} else if( !stepItem.points ) {
			//调用上一步的数据
			let prevStep = item.steps[currentIndex - 1];
			stepItem.startX = prevStep.x;
			stepItem.startY = prevStep.y;
			stepItem.points = prevStep.points;
			stepItem.firstPoint = prevStep.firstPoint;
		}

	}

	draw(item,stepItem,cxt){
		cxt.save();
		//根据type调用
		!!this[item.type] && this[item.type](stepItem,cxt,Math, Math.PI / 180);
		cxt.restore();
	}

	rect( stepItem, cxt, Math , rotUnit ){
		let [x,y,w,h] = [stepItem.x,stepItem.y,stepItem.width,stepItem.height];
		let [tx,ty] = [Math.tan(stepItem.skewX * rotUnit),Math.tan(stepItem.skewY * rotUnit)];
		cxt.beginPath();
		cxt.transform(stepItem.scaleX,tx,ty,stepItem.scaleY,x + w/2,y + h/2 );
		cxt.rotate( stepItem.rotate * Math.PI / 180 );
		cxt.rect( - w / 2 , - h / 2 , w , h);
		cxt.closePath();
		cxt.fillStyle = stepItem.fillStyle;
		cxt.strokeStyle = stepItem.strokeStyle;
		cxt.fill();
		cxt.stroke();
	}

	text( stepItem, cxt, Math , rotUnit ){
		let [fstyle,fweight,fsize,ffamily,text] = [
			stepItem.fontStyle || "normal",
			stepItem.fontWeight || "normal",
			stepItem.fontSize || "24px",
			stepItem.fontFamily || "微软雅黑",
			stepItem.text || ""
		];
		cxt.font = fstyle+" "+fweight+" "+fsize+" "+ffamily;
		let [x,y,w,h] = [stepItem.x,stepItem.y,cxt.measureText(text).width,parseInt(fsize)];
		let [tx,ty] = [Math.tan(stepItem.skewX * rotUnit),Math.tan(stepItem.skewY * rotUnit)];
		cxt.transform(stepItem.scaleX,tx,ty,stepItem.scaleY,x + w/2,y + h/2 );
		cxt.rotate( stepItem.rotate * Math.PI / 180 );
		cxt.fillStyle = stepItem.fillStyle;
		cxt.strokeStyle = stepItem.strokeStyle;
		cxt.fillText(text,-w/2,-h/2);
		cxt.strokeText(text,-w/2,-h/2);
	}

	polygon( stepItem, cxt, Math , rotUnit ){
		let points = stepItem.points;
		let [ x, y, firstPoint ] = [ stepItem.x, stepItem.y, stepItem.firstPoint ];
		let [tx,ty] = [ Math.tan(stepItem.skewX * rotUnit),Math.tan(stepItem.skewY * rotUnit)];

		cxt.beginPath();
		cxt.transform(stepItem.scaleX,tx,ty,stepItem.scaleY, x, y);
		cxt.rotate( stepItem.rotate * Math.PI / 180 );
		cxt.fillStyle = stepItem.fillStyle;
		cxt.strokeStyle = stepItem.strokeStyle;

		cxt.moveTo( firstPoint.x - x, firstPoint.y - y );

		let [i,point] = [0];
		
		for( ; point = points[i++]; ){
			cxt.lineTo( point.x - x, point.y - y );
		}
		cxt.closePath();
		cxt.fill();
		cxt.stroke();
	}

	//回收已经完成的弹幕
	recovery( item, stepItem ){
		if( stepItem.pastTime >= stepItem.duration ){
			item.currentIndex++;
			stepItem.pastTime = 0;
		}

		if( !item.steps[item.currentIndex] ){
			item.hide = true;
			item.currentIndex = 0;
		}
	}

	//运动时间曲线
	Tween(type,...data){

		const trail = {
			
			linear : ( t, b, c, d ) => c * t/d + b,

			easeIn : ( t, b, c, d ) => c * ( t /= d ) * t + b,

			easeOut : ( t, b, c, d ) => -c *( t/=d )*( t - 2 ) + b,

			easeInOut : ( t, b, c, d ) => {
				if ( ( t/=d/2 ) < 1 ) return c/2 * t * t + b;
            	return -c/2 * ( (--t) * (t-2) - 1 ) + b;
			}

		}

		return !!trail[type] && trail[type](...data);

	}
}

//main
class DMer {
	//初始化
	constructor(wrap,opts = {}){

		if(!wrap){
			throw new Error("没有设置正确的wrapper");
		}

		//datas
		this.wrapper = wrap;
		this.width = wrap.clientWidth;
		this.height = wrap.clientHeight;
		this.canvas = document.createElement("canvas");
		this.canvas2 = document.createElement("canvas");

		this.normal = new normalDM(this.canvas,opts);
		this.effect = new effectDM(this.canvas2,opts);

		this.name = opts.name || "";

		//status
		this.drawing = opts.auto || false;
		this.startTime = new Date().getTime();

		//fn
		this[init]();
		this[loop]();
	}

	[init](){
		this.canvas.style.cssText = "position:absolute;z-index:100;top:0px;left:0px;";
		this.canvas2.style.cssText = "position:absolute;z-index:101;top:0px;left:0px;";
		this.setSize();
		this.wrapper.appendChild(this.canvas);
		this.wrapper.appendChild(this.canvas2);
	}

	//loop
	[loop](normal = this.normal,effect = this.effect,prev = this.startTime){
		
		let now = new Date().getTime();

		if(!this.drawing){
			normal.clearRect();
			effect.clearRect();
			return false;
		} else {
			let [w,h,time] = [this.width,this.height,now - prev];
			normal.update(w,h,time);
			effect.update(w,h,time);
		}

		requestAnimationFrame( () => { this[loop](normal,effect,now); } );
	}

	// API 

	//添加数据
	inputData(obj = {}){
		if( typeof obj != "object" || !obj.type ){
			return false;
		}
		this.normal.add(obj);
	}

	//添加高级弹幕
	inputEffect(obj = {}){
		if( typeof obj != "object" || !obj.type || !obj.steps ){
			return false;
		}

		this.effect.add(obj);
	}

	//清除所有弹幕
	clear(){
		this.normal.clear();
		this.effect.clear();
	}

	//重置
	reset(i){
		this.normal.reset(i);
		this.effect.reset(i);
	}

	//暂停
	pause(){
		this.normal.pause();
		this.effect.pause();
	}

	//继续
	run(){
		this.normal.run();
		this.effect.run();
	}

	//添加过滤
	addFilter(key,val){
		this.normal.addFilter(key,val);
	}

	//禁用高级弹幕
	disableEffect(){
		this.effect.disableEffect();
	}

	//启用高级弹幕
	enableEffect(){
		this.effect.enableEffect();
	}

	//设置宽高
	setSize( w = this.width, h = this.height){

		if(!Number.isInteger(w) || w < 0 || !Number.isInteger(h) || h < 0) 
		return false;

		this.width = w;
		this.height = h;
		this.canvas.width = w;
		this.canvas.height = h;
		this.canvas2.width = w;
		this.canvas2.height = h;

		this.normal.getSize();
		this.effect.getSize();
	}
	
	//获取宽高
	getSize(){
		return {
			width : this.width,
			height : this.height
		};
	}

	//改变全局样式
	changeStyle(opts = {}){
		this.normal.changeStyle(opts);
	}

	//启用
	start(){
		if(this.drawing)
		return false;

		this.drawing = true;
		this[loop]();
	}

	//停止
	stop(){
		this.drawing = false;
	}

}

let DMOutput = function(wrapper,opts){
	let DM = new DMer(wrapper,opts);

	return {
		start : DM.start.bind(DM),
		stop : DM.stop.bind(DM),
		changeStyle : DM.changeStyle.bind(DM),
		setSize : DM.setSize.bind(DM),
		inputData : DM.inputData.bind(DM),
		inputEffect : DM.inputEffect.bind(DM),
		clear : DM.clear.bind(DM),
		reset : DM.reset.bind(DM),
		pause : DM.pause.bind(DM),
		run : DM.run.bind(DM),
		addFilter : DM.addFilter.bind(DM),
		disableEffect : DM.disableEffect.bind(DM),
		enableEffect : DM.enableEffect.bind(DM),
		getSize : DM.getSize.bind(DM)
	};
};

if( typeof module != 'undefined' && module.exports ){
	module.exports = DMOutput;
} else if( typeof define == "function" && define.amd ){
	define(function(){ return DMOutput;});
} else {
	window.DanMuer = DMOutput;
}

})(window,Math);