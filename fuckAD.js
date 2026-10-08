function getRotation() {
    //1竖屏 2横屏
    importPackage(android.content);
    return context.getResources().getConfiguration().orientation;
}

function getScreenHW() {
    // console.log(getRotation());
    // 正常的手机，高度，是大于宽度的。但是，device.width,device.height，函数，有时候是会获取错误的。
    // 强行扭正。

    // 宽取小的值
    let w = device.width > device.height ? device.height : device.width;
    // 高取大的值
    let h = device.width > device.height ? device.width : device.height;

    if (getRotation() == 2) {
        // 横屏，交换正常的。
        return { height: w, width: h };
    } else {
        return { height: h, width: w };
    }
}

function pageUpBySwipe(time) {
    let screenHW = getScreenHW();
    let h = screenHW.height; //屏幕高
    let w = screenHW.width; //屏幕宽

    let x = random((w * 1) / 3, (w * 2) / 3); //横坐标随机。防止检测。
    let h1 = (h / 6) * 5; //纵坐标6分之5处
    let h2 = h / 6; //纵坐标6分之1处
    console.log(time + "ms");
    console.log("x:" + x + ",h1:" + h1 + ",h2:" + h2);
    swipe(x, h1, x, h2, time); //向上翻页(从纵坐标6分之1处拖到纵坐标6分之5处)
}


let s = storages.create("jutime111223312");

function getTimeStorage() {
    // 分别 记录横屏，和竖屏的时间。
    let t = s.get("time" + getRotation());
    if (t != null && t > 0) {
        time = t;
    } else {
        time = 600;
    }
    return time;
}

function setTimeStorage(time) {
    s.put("time" + getRotation(), time);
}

function eleInScreen(ele) {
    let bounds = ele.bounds();

    let screenHW = getScreenHW();
    let h = screenHW.height; //屏幕高
    let w = screenHW.width; //屏幕宽

    return (
        bounds.left >= 0 &&
        bounds.left <= w &&
        bounds.top >= 0 &&
        bounds.top <= h &&
        bounds.right <= w &&
        bounds.right >= 0 &&
        bounds.bottom <= h &&
        bounds.bottom >= 0
    );
}

function textInScreen(textStr) {
    let eles = text(textStr).find()
    if (eles && eles.length > 0) {
        for (let i = 0; i < eles.length; i++) {
            if (eleInScreen(eles[i])) return true;
        }
    }
}

function includeAll() {
    // arguments 对象。是一个类数组对象。包含了函数调用时，传入的所有实参
    for (let i = 0; i < arguments.length; i++) {
        if (text(String(arguments[i])).findOnce() == null) {
            return false;
        }
    }

    return true;
}

function liveAD() {
    //观看直播的界面，autojs捕获不了很多有价值的内容，唯有，倍速，这个关键词，会消失。这一个特征。
    // 在播放界面里面（存在，全x集，或者 存在，剧情简介），且在直播里面（倍速消失）
    let qjele = textMatches(/全\d+集/).findOnce()
    let inPlayListPage = qjele != null && includeAll("剧情简介");
    return inPlayListPage && !textInScreen("倍速");
}

function netError() {
    return includeAll("网络出错，请点击重试", "发弹幕", "分享", "继续播放") && !textInScreen("倍速");
}


function xSecondsAD() {
    let ele = text("上滑继续观看短剧").findOnce();
    // 在横屏模式下，上滑看剧，可能搞到屏幕之外。
    if (getRotation() == 1) {
        return ele && eleInScreen(ele)
    }

    // 如果在屏幕之外。那么，且，屏幕内部没有正常的标记。就是广告界面。滑动即可。
    return ele && !textInScreen("倍速")
}

let gameMonitorLastTime = new Date().getTime();

function gameAD() {

    let qjele = textMatches(/全\d+集/).findOnce()
    let inPlayListPage = qjele != null && includeAll("剧情简介");

    if (inPlayListPage) return false;

    // 这个函数,拿的参数太多.怀疑费电.限制一下频率.牺牲一点时间.
    if (new Date().getTime() - gameMonitorLastTime < 5000) return false;

    // 在有些正常播放的界面，依然，存在TextureView，但是，正确的是，不存在，上滑继续观看短剧
    if (text("上滑继续观看短剧").findOnce() != null) return false;

    if (textInScreen("倍速")) return false;

    let eles = find();
    gameMonitorLastTime = new Date().getTime();
    for (e of eles) {
        if (e.className().indexOf("TextureView") != -1) {
            return e.bounds().bottom > e.bounds().top
        }
    }
}

function task() {
    let autoScroll = false

    // 可扩展，各种广告方式。类似写法即可。区分打日志，方便观察调试。
    if (xSecondsAD()) {
        console.log("x秒后，继续看剧")
        autoScroll = true
    } else if (liveAD()) {
        console.log("购物直播广告，可直接跳过")
        autoScroll = true
    } else if (netError()) {
        console.log("网络出错，点击重试")
        autoScroll = true
    } else if (gameAD()) {
        console.log("游戏广告，直接滑动")
        autoScroll = true
    }

    if (autoScroll) {
        time = getTimeStorage();
        if (pageUp) {
            // 上次翻页了。依然处于广告。增加滑动时间。
            time += 100;
        }

        pageUpBySwipe(time)
        setTimeStorage(time);
        // 标记翻页了。下一次，如果还是处于广告，就增加翻页时间。动态调整翻页时间。
        pageUp = true

        // 翻页之后，稍微停几秒。无所谓，防止翻页失败，频繁翻页。如果成功，那么程序等待，用户依然也无感知。
        sleep(3000);
    } else {
        pageUp = false
    }

}

pageUp = false;
while (1) {
    task();
    // 监控频率。
    sleep(500);
}