# DanMuer - 2017/07/07

### 版本特点 v3.1.0

#### 修改部分
- 将Tween时间曲线算法单独写成了一个类，重构了代码结构
- 高级弹幕的数据结构进行了改变，将原来的属性"type"所对应的时间曲线替换成了属性"timing"；将Tween算法的种类所对应的属性换成了"type"，具体可以参看 README.md
- 普通弹幕去除了speed属性，将统一采用Tween算法来实现弹幕的运动，所以初始化参数有变化，请参看 README.md

#### 新增特性
- 新增调整全局弹幕的方向
- 新增调整弹幕的时间曲线

### 版本特点 v3.0.0
- 相比第二版性能更好，完成了模块间的解耦
- 适用范围将适用但不限于播放器
- 支持绝大多数新版本主流浏览器
- 支持高级弹幕的发送
- 添加了过滤功能
- 普通弹幕容量大幅增加
- 提供了丰富的API