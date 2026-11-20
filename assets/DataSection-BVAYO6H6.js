import{d as cn,h as ur,m as xn,i as lr,c as a,o as c,k as V,x as gr,j as Xn,g as an,y as yr,s as on,F as x,r as z,u as o,e as $n,a as e,t,n as Dn,z as dr,f as E,l as B,b as Z,B as xr,C as vr,E as ln,_ as $r,q as wr,G as zr}from"./index-BE9nGY-i.js";const Mr=cn({__name:"PlotBox",props:{h:{}},setup(n){const r=xn(null),i=xn(0);let u=null;function L(_){const f=_.getBoundingClientRect().width;f>0&&Math.abs(f-i.value)>.5&&(i.value=f)}return ur(()=>{const _=r.value;_&&(L(_),!(typeof ResizeObserver>"u")&&(u=new ResizeObserver(()=>L(_)),u.observe(_)))}),lr(()=>{u?.disconnect(),u=null}),(_,f)=>(c(),a("div",{ref_key:"el",ref:r,class:"pbox",style:V({height:`${n.h}px`})},[i.value>0?gr(_.$slots,"default",{w:i.value,h:n.h},void 0,!0,0):Xn("",!0)],4))}}),hn=an(Mr,[["__scopeId","data-v-95ffa012"]]),Sr=["data-on","width","height","viewBox","aria-label"],Er={"aria-hidden":"true"},Or=["x1","x2","y1","y2"],Tr=["y"],Rr=["x1","x2","y1","y2"],Br=["x","y"],Cr=["d"],Ar=["d"],Fr=["x","y","fill"],Ir=cn({__name:"RankCurve",props:{series:{},yMax:{},h:{},aria:{},on:{type:Boolean}},setup(n){const{t:r}=$n();function i(u,L,_,f){const G=Math.max(70,L-46),y=10,w=_-26,C=Math.max(2,...u.map(m=>m.values.length)),P=Math.log10(C),k=m=>30+Math.log10(Math.max(m,1))/P*(G-30),O=Math.log10(f),M=m=>w-Math.log10(Math.max(m,1))/O*(w-y),T=u.map(m=>{const S=[];let j=[];const mn=()=>{if(!j.length)return;const J=j.map(Sn=>`${Sn.x.toFixed(1)},${Sn.y.toFixed(1)}`).join(" L"),K=`M${J}`,Mn=`M${j[0].x.toFixed(1)},${w.toFixed(1)} L${J} L${j[j.length-1].x.toFixed(1)},${w.toFixed(1)} Z`;S.push({line:K,area:Mn}),j=[]};return m.values.forEach((J,K)=>{J>0?j.push({x:k(K+1),y:M(J)}):mn()}),mn(),{id:m.id,colour:m.colour,dash:m.dash,paths:S}}),R=m=>m>=1e6?`${m/1e6}M`:m>=1e3?`${m/1e3}k`:String(m),nn=Math.log10(f)>=6?2:1,sn=[1,10,100,1e3,1e4,1e5,1e6].filter(m=>m<=f),wn=sn.filter((m,S)=>S%nn===0||S===sn.length-1).map(m=>({y:M(m),label:R(m)})),_n=u[0]?.values.length??0,zn=[1,10,100,_n].filter((m,S,j)=>m>=1&&m<=_n&&j.indexOf(m)===S).map(m=>({x:k(m),label:String(m)})),X=u.map(m=>{const S=m.values.length,j=m.values[S-1]??1;return{id:m.id,colour:m.colour,x:k(S)+5,y:M(j),count:S}});X.sort((m,S)=>m.y-S.y);for(let m=1;m<X.length;m+=1){const S=X[m-1];Math.abs(X[m].x-S.x)<58&&X[m].y-S.y<14&&(X[m].y=S.y+14)}return{runs:T,ends:X,yt:wn,xt:zn,x0:30,x1:G,base:w}}return(u,L)=>(c(),yr(hn,{h:n.h},{default:on(({w:_})=>[(c(!0),a(x,null,z([i(n.series,_,n.h,n.yMax)],f=>(c(),a("svg",{key:0,class:"plot","data-on":n.on===!1?"false":"true",width:_,height:n.h,viewBox:`0 0 ${_} ${n.h}`,role:"img","aria-label":o(r)(n.aria)},[e("g",Er,[(c(!0),a(x,null,z(f.yt,d=>(c(),a("line",{key:`g${d.label}`,class:"grid",x1:f.x0,x2:f.x1,y1:d.y,y2:d.y},null,8,Or))),128)),(c(!0),a(x,null,z(f.yt,d=>(c(),a("text",{key:`y${d.label}`,class:"t-tick",x:"25",y:d.y+3.6,"text-anchor":"end"},t(d.label),9,Tr))),128)),e("line",{class:"base",x1:f.x0,x2:f.x1,y1:f.base,y2:f.base},null,8,Rr),(c(!0),a(x,null,z(f.xt,d=>(c(),a("text",{key:`x${d.label}`,class:"t-tick",x:d.x,y:n.h-10,"text-anchor":"middle"},t(d.label),9,Br))),128))]),(c(!0),a(x,null,z(f.runs,(d,v)=>(c(),a("g",{key:d.id},[(c(!0),a(x,null,z(d.paths,($,g)=>(c(),a("path",{key:`a${g}`,class:"area",d:$.area,style:V({fill:d.colour,"--i":v})},null,12,Cr))),128)),(c(!0),a(x,null,z(d.paths,($,g)=>(c(),a("path",{key:`l${g}`,class:Dn(["curve",{"curve--dash":!!d.dash}]),pathLength:1,d:$.line,style:V({stroke:d.colour,strokeDasharray:d.dash||void 0,"--i":v})},null,14,Ar))),128))]))),128)),(c(!0),a(x,null,z(f.ends,d=>(c(),a("text",{key:`e${d.id}`,class:"t-end",x:d.x,y:d.y+3.6,fill:d.colour},t(d.id)+" "+t(d.count),9,Fr))),128))],8,Sr))),128))]),_:1},8,["h"]))}}),Kn=an(Ir,[["__scopeId","data-v-5bcf3ae3"]]),jr=`category,name,unit,L3,L2_estimated,L1\r
residential,kitchen,hours,35.108,271.52,868.22\r
industrial,factory_workshop,hours,0,311.052,857.146\r
professional,office,hours,162.374,177.078,789.172\r
residential,living_room,hours,0,43.286,758.961\r
residential,dining_room,hours,75.219,174.127,400.511\r
residential,storage_room,hours,0,98.377,502.795\r
industrial,workroom,hours,65.538,110,387.614\r
commercial,retail_store,hours,32.72,157.403,354.991\r
commercial,logistics_facility,hours,0,127.89,401.032\r
residential,bathroom,hours,0,169.208,338.894\r
residential,bedroom,hours,0,51.156,431.32\r
commercial,entertainment_venue,hours,0,0,472.792\r
professional,classroom,hours,0,12.5,338.894\r
professional,laboratory,hours,34.107,37.5,215.659\r
public,park_garden,hours,0,17.708,247.554\r
other,other,hours,0,64.117,177.474\r
commercial,restaurant,hours,0,28,197.688\r
public,public_facility,hours,0,0,215.265\r
commercial,beverage_shop,hours,29.72,32,141.206\r
commercial,pet_shop,hours,0,0,202.625\r
professional,healthcare_facility,hours,0,0,200.256\r
public,street,hours,0,0,193.738\r
public,farm,hours,0,19.675,150.685\r
residential,study_room,hours,34.494,34,95.362\r
public,indoor_sports_venue,hours,0,0,157.598\r
commercial,hotel,hours,0,38.377,112.965\r
industrial,industrial_warehouse,hours,0,0,126.571\r
residential,laundry_area,hours,30.72,25.026,69.354\r
commercial,performance_venue,hours,0,0,123.827\r
public,sports_area,hours,0,0,118.395\r
public,transportation,hours,0,0,90\r
commercial,hair_salon,hours,0,0,78.405\r
industrial,construction_site,hours,0,0,74.533\r
commercial,beauty_salon,hours,0,0,56.482\r
industrial,equipment_room,hours,0,0,15.605\r
professional,conference_center,hours,0,0,14.738\r
residential,balcony,hours,0,0,13.004\r
industrial,testing_lab,hours,0,0,8.669\r
`,Dr=`layer,name,unit,L3,L2_estimated,L1,zh\r
subtask,wipe,occurrences,30,546,4016,擦拭\r
subtask,open,occurrences,125,672,2882,打开\r
subtask,fold,occurrences,26,281,2565,折叠\r
subtask,close,occurrences,153,578,1401,关闭\r
subtask,arrange,occurrences,16,199,1812,摆放整理\r
subtask,remove,occurrences,37,342,1572,移除\r
subtask,throw,occurrences,0,139,1665,丢弃\r
subtask,organize,occurrences,16,132,1062,整理归置\r
subtask,pour,occurrences,67,64,889,倾倒\r
subtask,unfold,occurrences,0,79,868,展开\r
subtask,collect,occurrences,22,120,802,收集\r
subtask,hang,occurrences,13,7,874,悬挂\r
subtask,insert,occurrences,48,144,596,插入\r
subtask,stack,occurrences,22,105,645,堆叠\r
subtask,clean,occurrences,2,28,720,清洁\r
subtask,cover,occurrences,0,54,620,覆盖\r
subtask,wrap,occurrences,36,126,336,包裹\r
subtask,cut,occurrences,40,32,418,切割\r
subtask,secure,occurrences,22,101,364,固定\r
subtask,tear,occurrences,0,0,443,撕开\r
subtask,install,occurrences,3,11,419,安装\r
subtask,spray,occurrences,0,24,396,喷洒\r
subtask,rinse,occurrences,0,13,398,冲洗\r
subtask,sort,occurrences,34,98,246,分类\r
subtask,tie,occurrences,1,40,319,系紧\r
subtask,tighten,occurrences,25,20,305,拧紧\r
subtask,sweep,occurrences,38,38,260,清扫\r
subtask,attach,occurrences,9,54,272,附着安装\r
subtask,seal,occurrences,0,27,300,密封\r
subtask,unscrew,occurrences,30,22,259,拧松螺丝\r
subtask,stick,occurrences,0,29,249,粘贴\r
subtask,coil,occurrences,0,82,165,盘绕\r
subtask,screw,occurrences,2,6,206,拧入螺丝\r
subtask,disassemble,occurrences,1,6,202,拆解\r
subtask,wash,occurrences,0,8,188,清洗\r
subtask,check,occurrences,89,52,51,检查\r
subtask,assemble,occurrences,19,14,155,组装\r
subtask,connect,occurrences,0,20,154,连接\r
subtask,replace,occurrences,7,31,96,更换\r
subtask,dry,occurrences,0,6,126,晾干／擦干\r
subtask,thread,occurrences,0,15,105,穿线\r
subtask,write,occurrences,43,56,21,书写\r
subtask,untie,occurrences,0,1,98,解开绳结\r
subtask,peel,occurrences,0,10,84,剥离\r
subtask,rearrange,occurrences,2,13,79,重新整理\r
subtask,button,occurrences,0,10,78,扣纽扣\r
subtask,separate,occurrences,4,16,67,分离\r
subtask,apply,occurrences,1,4,77,涂抹／施加\r
subtask,scrape,occurrences,0,4,77,刮除\r
subtask,cap,occurrences,19,41,21,盖盖\r
subtask,untangle,occurrences,2,0,76,解开缠绕\r
subtask,reassemble,occurrences,0,2,76,重新组装\r
subtask,scrub,occurrences,0,3,64,刷洗\r
subtask,scoop,occurrences,0,0,64,舀取\r
subtask,bind,occurrences,0,9,55,捆绑\r
subtask,wind,occurrences,0,0,62,缠绕\r
subtask,unzip,occurrences,0,8,54,拉开拉链\r
subtask,slice,occurrences,0,31,30,切片\r
subtask,crumple,occurrences,0,0,59,揉皱\r
subtask,staple,occurrences,0,7,50,装订\r
subtask,zip,occurrences,0,7,50,拉上拉链\r
subtask,draw,occurrences,23,0,32,绘画\r
subtask,fill,occurrences,0,9,40,填充\r
subtask,erase,occurrences,2,0,40,擦除\r
subtask,unplug,occurrences,0,2,37,拔掉插头\r
subtask,test,occurrences,5,4,29,测试\r
subtask,stamp,occurrences,0,0,32,盖章\r
subtask,wring,occurrences,0,2,29,拧干\r
subtask,loosen,occurrences,0,0,28,旋松\r
subtask,stir,occurrences,9,0,19,搅拌\r
subtask,drape,occurrences,0,0,26,披挂／覆盖\r
subtask,load,occurrences,0,5,20,装载\r
subtask,discard,occurrences,15,0,9,弃置\r
subtask,tuck,occurrences,0,0,24,塞入／掖好\r
subtask,unwrap,occurrences,0,0,24,拆开包裹\r
subtask,detach,occurrences,0,6,18,拆卸／分离\r
subtask,trim,occurrences,0,1,22,修剪\r
subtask,divide,occurrences,0,4,18,分成若干份\r
subtask,unroll,occurrences,0,5,17,展开卷材\r
subtask,punch,occurrences,0,0,21,打孔\r
subtask,reattach,occurrences,0,1,20,重新固定\r
subtask,scan,occurrences,0,0,17,扫描\r
subtask,plug,occurrences,0,1,16,插接电源\r
subtask,tape,occurrences,0,5,12,贴胶带\r
subtask,disconnect,occurrences,0,1,15,断开连接\r
subtask,switch,occurrences,0,5,11,切换\r
subtask,wet,occurrences,0,2,12,润湿\r
subtask,pry,occurrences,0,1,12,撬开\r
subtask,reinsert,occurrences,0,1,11,重新插入\r
subtask,clamp,occurrences,0,1,10,夹紧\r
subtask,dispense,occurrences,0,4,7,分配／挤出\r
subtask,pack,occurrences,0,4,7,打包\r
subtask,brush,occurrences,0,1,9,刷拭\r
subtask,pair,occurrences,0,0,9,配对\r
subtask,polish,occurrences,0,2,7,抛光\r
subtask,soak,occurrences,0,1,7,浸泡\r
subtask,dice,occurrences,0,0,7,切丁\r
subtask,sew,occurrences,0,0,7,缝制\r
subtask,uncap,occurrences,4,0,0,取下盖子\r
atomic,place,occurrences,715.0,3593.0,20457.0,放置\r
atomic,grasp,occurrences,728.0,2081.0,16403.0,抓握\r
atomic,pick,occurrences,49.0,1131.0,17326.0,拿起\r
atomic,move,occurrences,4.0,415.0,13158.0,移动\r
atomic,reach,occurrences,634.0,986.0,1397.0,伸手接近\r
atomic,push,occurrences,0,508.0,1230.0,推动\r
atomic,adjust,occurrences,163.0,561.0,970.0,调整\r
atomic,transport,occurrences,127.0,339.0,655.0,搬运／转移\r
atomic,turn,occurrences,4.0,75.0,955.0,转动\r
atomic,pull,occurrences,3.0,117.0,823.0,拉动\r
atomic,lift,occurrences,404.0,275.0,61.0,抬起\r
atomic,hold,occurrences,83.0,170.0,398.0,握持\r
atomic,release,occurrences,48.0,67.0,522.0,松开\r
atomic,spread,occurrences,0,19.0,599.0,展开铺开\r
atomic,roll,occurrences,0,18.0,485.0,滚动／卷动\r
atomic,lay,occurrences,0,26.0,463.0,平放\r
atomic,align,occurrences,58.0,148.0,251.0,对齐\r
atomic,flip,occurrences,13.0,62.0,358.0,翻转\r
atomic,straighten,occurrences,5.0,46.0,304.0,摆正\r
atomic,press,occurrences,10.0,46.0,150.0,按压\r
atomic,squeeze,occurrences,0,21.0,184.0,挤压\r
atomic,position,occurrences,42.0,99.0,50.0,定位\r
atomic,reposition,occurrences,41.0,96.0,51.0,重新定位\r
atomic,carry,occurrences,0,14.0,152.0,携带\r
atomic,stand,occurrences,0,0,162.0,立起\r
atomic,dip,occurrences,0,4.0,146.0,蘸取\r
atomic,rotate,occurrences,9.0,36.0,91.0,旋转\r
atomic,shake,occurrences,17.0,51.0,42.0,摇晃\r
atomic,drop,occurrences,4.0,12.0,85.0,松手落下\r
atomic,bring,occurrences,0,5.0,49.0,拿到近处\r
atomic,drag,occurrences,0,5.0,45.0,拖动\r
atomic,lower,occurrences,5.0,12.0,24.0,降低／放下\r
atomic,tilt,occurrences,11.0,0,25.0,倾斜\r
atomic,slide,occurrences,0,5.0,29.0,滑动\r
atomic,retract,occurrences,0,3.0,28.0,撤回\r
atomic,tap,occurrences,0,3.0,28.0,轻敲\r
atomic,transfer,occurrences,0,3.0,28.0,转移\r
atomic,orient,occurrences,4.0,12.0,10.0,调整朝向\r
atomic,lean,occurrences,0,0,25.0,倾靠\r
atomic,adjust_grip,occurrences,4.0,10.0,10.0,调整握姿\r
atomic,rub,occurrences,0,1.0,14.0,摩擦\r
atomic,bend,occurrences,0,0,14.0,弯曲\r
atomic,pinch,occurrences,0,3.0,11.0,捏取\r
atomic,poke,occurrences,0,3.0,11.0,戳碰\r
atomic,extend,occurrences,0,0,11.0,伸展\r
atomic,feel,occurrences,0,0,11.0,触摸感知\r
`,Nr=`category,name,unit,L3,L2_estimated,L1,zh\r
,box,annotation occurrences,13848.17,47519.9,119507.814,盒子\r
,bottle,annotation occurrences,11512.236,38148.921,72244.254,瓶子\r
,rack,annotation occurrences,17026.343,52701.769,32454.822,置物架\r
,paper,annotation occurrences,9166.967,29663.844,43258.824,纸张\r
,pen,annotation occurrences,10551.527,33407.421,35056.793,笔\r
,cloth,annotation occurrences,5174.941,18050.469,50512.926,布料\r
,cup,annotation occurrences,4107.924,14729.779,48120.142,杯子\r
,bag,annotation occurrences,643.421,4104.993,43494.636,袋子\r
,tray,annotation occurrences,2898.242,10274.008,31585.644,托盘\r
,cabinet,annotation occurrences,8681.564,26415.008,7406.328,柜子\r
,towel,annotation occurrences,1061,4723.67,30813.406,毛巾\r
,card,annotation occurrences,5444.156,16983.005,13010.742,卡片\r
,book,annotation occurrences,2685.944,9199.117,22825.723,书籍\r
,table,annotation occurrences,673.57,3480.556,29196.94,桌子\r
,plate,annotation occurrences,1397.785,5435.529,24843.501,盘子\r
,cable,annotation occurrences,2007.421,7127.708,22108.931,线缆\r
,bowl,annotation occurrences,1210.682,4822.366,23806.389,碗\r
,keyboard,annotation occurrences,2576,8648.85,18417,键盘\r
,bin,annotation occurrences,2514.447,8381.056,16754.28,垃圾桶\r
,lid,annotation occurrences,1244.467,4812.64,21584.78,盖子\r
,basket,annotation occurrences,748.411,3333.635,21768.066,篮子\r
,mouse,annotation occurrences,2121,7181.55,16371,鼠标\r
,shirt,annotation occurrences,606,2887.093,21381.867,衬衫\r
,folder,annotation occurrences,2273,7553.287,14685.734,文件夹\r
,package,annotation occurrences,1197.457,4515.626,18465.092,包裹\r
,pad,annotation occurrences,2956.222,9413.15,10889.669,垫子\r
,brush,annotation occurrences,606,2749.0,18619.994,刷子\r
,tissue,annotation occurrences,37.421,1062.008,18994.92,纸巾\r
,tape,annotation occurrences,1735.887,5826.919,12385.133,胶带\r
,part,annotation occurrences,3929.156,11977.417,3798.984,零件\r
,spoon,annotation occurrences,758,3056.76,15655.208,勺子\r
,scissors,annotation occurrences,1212,4250.464,12289.273,剪刀\r
,eraser,annotation occurrences,1661.046,5416.676,8670.737,橡皮擦\r
,sponge,annotation occurrences,455,1985.664,12413.275,海绵\r
,pliers,annotation occurrences,2636.914,8079.515,3375.457,钳子\r
,pot,annotation occurrences,3143.325,9491.412,1228.752,锅\r
,comb,annotation occurrences,454,1876.982,10299.638,梳子\r
,chair,annotation occurrences,0,586.757,11735.141,椅子\r
,screwdriver,annotation occurrences,1673.719,5286.434,5305.553,螺丝刀\r
,monitor,annotation occurrences,2918.802,8781.205,496.01,显示器\r
,stapler,annotation occurrences,1061,3491.641,6172.819,订书机\r
,rope,annotation occurrences,303,1356.862,8957.237,绳子\r
,drawer,annotation occurrences,299.364,1339.429,8826.72,抽屉\r
,vase,annotation occurrences,2207.811,6635.835,248.005,花瓶\r
,object,annotation occurrences,112.262,745.429,8172.889,物体\r
,can,annotation occurrences,236.195,138.892,8606.105,罐头罐\r
,whiteboard,annotation occurrences,2058.129,6205.389,620.012,白板\r
,chopsticks,annotation occurrences,1571.662,4810.807,1916.401,筷子\r
,glasses,annotation occurrences,1160.037,3645.258,3302.974,眼镜\r
,label,annotation occurrences,149.682,801.326,7045.594,标签\r
,kettle,annotation occurrences,1234.878,3848.363,2874.602,水壶\r
,shoe,annotation occurrences,0,368.625,7372.509,鞋子\r
,clip,annotation occurrences,336.785,1300.633,5805.569,夹子\r
,screw,annotation occurrences,340.421,1309.649,5767.744,螺丝\r
,nut,annotation occurrences,1086.513,3403.759,2884.372,螺母\r
,roll,annotation occurrences,1421.98,4344.851,1578.213,卷筒\r
,cart,annotation occurrences,0,349.461,6989.229,手推车\r
,container,annotation occurrences,187.103,872.441,6222.668,容器\r
,flower,annotation occurrences,1609.083,4831.758,90.184,花朵\r
,cable tie,annotation occurrences,935.513,2934.488,2558.96,扎带\r
,dustpan,annotation occurrences,0,4669.8,1341.481,簸箕\r
,snack,annotation occurrences,0,276.187,5523.745,零食\r
,candy,annotation occurrences,673.57,2146.966,2525.141,糖果\r
,sink,annotation occurrences,0,249.132,4982.644,水槽\r
,detergent,annotation occurrences,0,230.532,4610.636,清洁剂\r
,refrigerator,annotation occurrences,0,217.004,4340.086,冰箱\r
,jar,annotation occurrences,224.523,847.173,3472.069,罐子\r
,rod,annotation occurrences,0,415.036,3810.257,杆件\r
,hanger,annotation occurrences,0,200.095,4001.897,衣架\r
,knife,annotation occurrences,0,193.331,3866.622,刀具\r
,mirror,annotation occurrences,0,190.513,3810.257,镜子\r
,hook,annotation occurrences,336.785,1134.357,2480.049,挂钩\r
,stamp,annotation occurrences,0,186.567,3731.346,印章\r
,wrench,annotation occurrences,598.729,1860.441,1285.116,扳手\r
,board,annotation occurrences,37.421,281.356,3381.885,板材\r
,band,annotation occurrences,0,175.294,3505.887,带子\r
,frame,annotation occurrences,561.308,1749.307,1307.662,框架\r
,clipboard,annotation occurrences,898.093,2694.842,11.273,写字板夹\r
,pillow,annotation occurrences,0,160.076,3201.518,枕头\r
,note,annotation occurrences,224.523,790.808,2344.774,便条\r
,wall,annotation occurrences,748.411,2257.069,236.732,墙面\r
,bed,annotation occurrences,0,148.803,2976.059,床\r
,pants,annotation occurrences,0,148.239,2964.786,裤子\r
,cosmetics,annotation occurrences,0,0,2885.875,化妆品\r
,handle,annotation occurrences,74.841,346.835,2446.23,把手\r
,keycap,annotation occurrences,710.99,2132.97,0,键帽\r
,faucet,annotation occurrences,0,133.021,2660.416,水龙头\r
,caliper,annotation occurrences,673.57,2020.709,0,游标卡尺\r
,base,annotation occurrences,374.205,1173.344,1014.565,底座\r
,bucket,annotation occurrences,0,120.057,2401.138,水桶\r
,washing machine,annotation occurrences,0,113.293,2265.863,洗衣机\r
,necklace,annotation occurrences,0,0,2356.046,项链\r
,basin,annotation occurrences,0,112.166,2243.317,盆\r
,bread,annotation occurrences,0,106.529,2130.588,面包\r
,curtain,annotation occurrences,0,105.966,2119.315,窗帘\r
,door,annotation occurrences,0,104.838,2096.769,门\r
,earring,annotation occurrences,0,0,2141.86,耳环\r
,battery,annotation occurrences,0,100.329,2006.585,电池\r
,squeegee,annotation occurrences,0,98.075,1961.493,刮水器\r
,blanket,annotation occurrences,0,96.384,1927.674,毯子\r
,weight plate,annotation occurrences,0,0,1972.766,杠铃片\r
,lipstick,annotation occurrences,0,0,1961.493,口红\r
,dumbbell,annotation occurrences,0,0,1916.401,哑铃\r
,trash,annotation occurrences,0,90.747,1814.945,垃圾\r
,ink,annotation occurrences,0,90.184,1803.672,墨水\r
,plant,annotation occurrences,336.785,1035.719,507.283,植物\r
,block,annotation occurrences,224.523,719.225,913.109,积木块\r
,remote control,annotation occurrences,0,83.42,1668.397,遥控器\r
,ball,annotation occurrences,0,83.42,1668.397,球\r
,water,annotation occurrences,0,83.42,1668.397,水\r
,ring,annotation occurrences,37.421,188.354,1521.848,戒指\r
,envelope,annotation occurrences,0,82.856,1657.124,信封\r
,tube,annotation occurrences,0,82.856,1657.124,管子\r
,drink,annotation occurrences,149.682,501.466,1048.384,饮料\r
,fork,annotation occurrences,0,78.911,1578.213,叉子\r
,bed sheet,annotation occurrences,0,77.22,1544.394,床单\r
,vacuum cleaner,annotation occurrences,0,72.147,1442.938,吸尘器\r
,ashtray,annotation occurrences,0,0,1476.756,烟灰缸\r
,glue,annotation occurrences,0,65.383,1307.662,胶水\r
,food,annotation occurrences,0,65.383,1307.662,食物\r
,bench,annotation occurrences,0,63.692,1273.843,长凳\r
,broom,annotation occurrences,0,63.692,1273.843,扫帚\r
,pump,annotation occurrences,0,62.001,1240.024,泵\r
,piece,annotation occurrences,0,61.438,1228.752,小块\r
,beverage,annotation occurrences,0,60.874,1217.479,饮品\r
,strap,annotation occurrences,0,59.747,1194.933,绑带\r
,straw,annotation occurrences,0,59.183,1183.66,吸管\r
,powder,annotation occurrences,0,59.183,1183.66,粉末\r
,scoop,annotation occurrences,0,57.492,1149.841,舀勺\r
,bracelet,annotation occurrences,0,0,1172.387,手链\r
,refill,annotation occurrences,37.421,160.735,969.474,替换芯\r
,cylinder,annotation occurrences,149.682,475.538,529.829,圆柱体\r
,debris,annotation occurrences,0,54.674,1093.476,碎屑\r
,bracket,annotation occurrences,74.841,264.542,800.379,支架\r
,bubble wrap,annotation occurrences,0,51.856,1037.111,气泡膜\r
,tape dispenser,annotation occurrences,0,51.292,1025.838,胶带切割器\r
,cat litter,annotation occurrences,0,0,1070.93,猫砂\r
,barrel,annotation occurrences,0,49.601,992.02,桶\r
,liquid,annotation occurrences,0,49.601,992.02,液体\r
,fan,annotation occurrences,0,49.037,980.747,风扇\r
,belt,annotation occurrences,0,49.037,980.747,皮带\r
,potato,annotation occurrences,0,46.219,924.382,土豆\r
,charger,annotation occurrences,0,46.219,924.382,充电器\r
,device,annotation occurrences,37.421,151.153,777.834,设备\r
,plastic wrap,annotation occurrences,0,45.655,913.109,保鲜膜\r
,mask,annotation occurrences,0,43.965,879.29,口罩\r
,dropper,annotation occurrences,0,43.965,879.29,滴管\r
,soap,annotation occurrences,0,43.401,868.017,肥皂\r
,dishwasher,annotation occurrences,0,43.401,868.017,洗碗机\r
,flashlight,annotation occurrences,0,43.401,868.017,手电筒\r
,treadmill,annotation occurrences,0,0,901.836,跑步机\r
,mop,annotation occurrences,0,41.146,822.925,拖把\r
,pillowcase,annotation occurrences,0,41.146,822.925,枕套\r
,key,annotation occurrences,0,40.019,800.379,钥匙\r
,scanner,annotation occurrences,0,39.455,789.106,扫描仪\r
,circuit board,annotation occurrences,0,39.455,789.106,电路板\r
,pill,annotation occurrences,187.103,564.69,67.638,药片\r
,hand sanitizer,annotation occurrences,0,38.892,777.834,免洗洗手液\r
,tong,annotation occurrences,0,38.328,766.561,夹钳\r
,toy,annotation occurrences,0,37.764,755.288,玩具\r
,kit,annotation occurrences,74.841,247.633,462.191,套件\r
,microwave,annotation occurrences,0,37.201,744.015,微波炉\r
,toothpaste,annotation occurrences,0,0,777.834,牙膏\r
,glove,annotation occurrences,37.421,142.135,597.466,手套\r
,tablet,annotation occurrences,187.103,561.872,11.273,平板电脑\r
,hair,annotation occurrences,0,36.073,721.469,头发\r
,gripper,annotation occurrences,187.103,561.308,0,夹持器\r
,lint roller,annotation occurrences,0,35.51,710.196,粘毛滚筒\r
,cushion,annotation occurrences,0,35.51,710.196,靠垫\r
,toiletries,annotation occurrences,0,34.946,698.923,洗漱用品\r
,tweezers,annotation occurrences,0,34.946,698.923,镊子\r
,nail clipper,annotation occurrences,0,0,698.923,指甲剪\r
,equipment,annotation occurrences,0,33.255,665.104,器材\r
,shoelace,annotation occurrences,0,32.692,653.831,鞋带\r
,lamp,annotation occurrences,0,32.128,642.558,台灯\r
,pan,annotation occurrences,0,31.564,631.285,平底锅\r
,laptop,annotation occurrences,37.421,135.935,473.464,笔记本电脑\r
,machine,annotation occurrences,0,30.437,608.739,机器\r
,polish,annotation occurrences,0,29.873,597.466,抛光剂\r
,hole punch,annotation occurrences,0,29.873,597.466,打孔器\r
,cutlery,annotation occurrences,0,29.31,586.193,餐具\r
,sofa,annotation occurrences,0,28.746,574.92,沙发\r
,lanyard,annotation occurrences,0,28.182,563.647,挂绳\r
,lighter,annotation occurrences,0,28.182,563.647,打火机\r
,hard drive,annotation occurrences,0,28.182,563.647,硬盘\r
,noodle,annotation occurrences,0,27.619,552.375,面条\r
,strainer,annotation occurrences,0,27.619,552.375,滤网\r
,casing,annotation occurrences,0,27.055,541.102,外壳\r
,cotton swab,annotation occurrences,0,27.055,541.102,棉签\r
,power strip,annotation occurrences,0,25.928,518.556,插线板\r
,umbrella,annotation occurrences,0,25.364,507.283,雨伞\r
,disc,annotation occurrences,0,24.8,496.01,圆盘\r
,socket,annotation occurrences,0,24.8,496.01,插座\r
,hat,annotation occurrences,0,24.8,496.01,帽子\r
,staple,annotation occurrences,0,24.8,496.01,订书钉\r
,shower head,annotation occurrences,0,24.8,496.01,花洒喷头\r
,power bank,annotation occurrences,37.421,129.735,349.461,充电宝\r
,bar,annotation occurrences,74.841,234.669,202.913,条状物\r
,crumb,annotation occurrences,0,24.237,484.737,碎屑颗粒\r
,water dispenser,annotation occurrences,0,23.673,473.464,饮水机\r
,peeler,annotation occurrences,0,23.11,462.191,削皮器\r
,mattress,annotation occurrences,0,23.11,462.191,床垫\r
,connector,annotation occurrences,0,21.982,439.645,连接器\r
,shampoo,annotation occurrences,0,0,450.918,洗发水\r
,tie,annotation occurrences,0,21.419,428.372,领带\r
,housing,annotation occurrences,0,21.419,428.372,壳体\r
,sign,annotation occurrences,0,21.419,428.372,标牌\r
,robotic arm,annotation occurrences,112.262,336.785,0,机械臂\r
,chart,annotation occurrences,112.262,336.785,0,图表\r
,shuttlecock,annotation occurrences,0,0,439.645,羽毛球\r
,palette,annotation occurrences,0,20.855,417.099,调色盘\r
,stationery,annotation occurrences,0,20.855,417.099,文具\r
,ladle,annotation occurrences,0,20.855,417.099,汤勺\r
,lip gloss,annotation occurrences,0,0,428.372,唇彩\r
,hose,annotation occurrences,0,20.291,405.826,软管\r
,calendar,annotation occurrences,0,20.291,405.826,日历\r
,file,annotation occurrences,0,20.291,405.826,文件\r
,power supply,annotation occurrences,0,19.728,394.553,电源\r
,module,annotation occurrences,0,19.728,394.553,模块\r
,railing,annotation occurrences,0,19.164,383.28,栏杆\r
,coat,annotation occurrences,0,19.164,383.28,外套\r
,printer,annotation occurrences,0,19.164,383.28,打印机\r
,suitcase,annotation occurrences,0,18.6,372.007,行李箱\r
,barbell,annotation occurrences,0,0,383.28,杠铃\r
,kettlebell,annotation occurrences,0,0,372.007,壶铃\r
,apron,annotation occurrences,0,17.473,349.461,围裙\r
,floor,annotation occurrences,0,17.473,349.461,地板\r
,ketchup,annotation occurrences,0,17.473,349.461,番茄酱\r
,nail,annotation occurrences,0,16.909,338.188,钉子\r
,headphones,annotation occurrences,0,16.909,338.188,耳机\r
,needle,annotation occurrences,0,16.346,326.916,针\r
,nozzle,annotation occurrences,0,16.346,326.916,喷嘴\r
,shell,annotation occurrences,0,16.346,326.916,外壳\r
,scale,annotation occurrences,0,16.346,326.916,秤\r
,garbage,annotation occurrences,0,16.346,326.916,垃圾\r
,waste,annotation occurrences,0,15.782,315.643,废弃物\r
,racket,annotation occurrences,0,0,326.916,球拍\r
,leaf,annotation occurrences,37.421,120.153,157.821,叶片\r
,spatula,annotation occurrences,0,14.655,293.097,锅铲\r
,jacket,annotation occurrences,0,14.655,293.097,夹克\r
,juice,annotation occurrences,0,14.655,293.097,果汁\r
,watch,annotation occurrences,0,14.655,293.097,手表\r
,sleeve,annotation occurrences,0,14.091,281.824,袖子\r
,spray,annotation occurrences,0,14.091,281.824,喷雾剂\r
,post,annotation occurrences,0,14.091,281.824,柱子\r
,lemon slice,annotation occurrences,37.421,112.262,146,柠檬片\r
,jigger,annotation occurrences,37.421,112.262,146,量酒器\r
,mint sprig,annotation occurrences,37.421,112.262,146,薄荷枝\r
,tag,annotation occurrences,0,13.528,270.551,吊牌\r
,grinder,annotation occurrences,0,13.528,270.551,研磨机\r
,hammer,annotation occurrences,0,13.528,270.551,锤子\r
,bike,annotation occurrences,0,0,281.824,自行车\r
,stove,annotation occurrences,0,12.964,259.278,炉灶\r
,terminal,annotation occurrences,0,12.4,248.005,端子\r
,baseboard,annotation occurrences,0,12.4,248.005,踢脚板\r
,yogurt,annotation occurrences,0,12.4,248.005,酸奶\r
,washer,annotation occurrences,37.421,117.334,101.457,垫圈\r
,egg,annotation occurrences,0,11.837,236.732,鸡蛋\r
,windowsill,annotation occurrences,0,11.837,236.732,窗台\r
,stirrer,annotation occurrences,0,11.837,236.732,搅拌棒\r
,pitcher,annotation occurrences,37.421,116.771,90.184,水罐\r
,pastry,annotation occurrences,0,11.273,225.459,糕点\r
,ruler,annotation occurrences,0,11.273,225.459,尺子\r
,tableware,annotation occurrences,0,11.273,225.459,餐具\r
,milk,annotation occurrences,0,10.709,214.186,牛奶\r
,hoodie,annotation occurrences,0,10.709,214.186,连帽衫\r
,floss,annotation occurrences,0,0,214.186,牙线\r
,funnel,annotation occurrences,0,10.146,202.913,漏斗\r
,whistle,annotation occurrences,0,0,202.913,哨子\r
,accessory,annotation occurrences,0,9.582,191.64,配件\r
,ginger,annotation occurrences,0,9.582,191.64,生姜\r
,orange,annotation occurrences,0,9.582,191.64,橙子\r
,filter,annotation occurrences,0,9.582,191.64,过滤器\r
,fastener,annotation occurrences,0,9.582,191.64,紧固件\r
,collar,annotation occurrences,0,9.018,180.367,衣领\r
,film,annotation occurrences,0,9.018,180.367,薄膜\r
,vest,annotation occurrences,0,9.018,180.367,背心\r
,scraper,annotation occurrences,0,9.018,180.367,刮刀\r
,chessboard,annotation occurrences,0,8.455,169.094,棋盘\r
,computer,annotation occurrences,0,8.455,169.094,电脑\r
,dress,annotation occurrences,0,8.455,169.094,连衣裙\r
,model,annotation occurrences,0,8.455,169.094,模型\r
,tomato,annotation occurrences,0,8.455,169.094,番茄\r
,counter,annotation occurrences,0,8.455,169.094,台面\r
,sausage,annotation occurrences,0,8.455,169.094,香肠\r
,paperclip,annotation occurrences,0,8.455,169.094,回形针\r
,jewelry,annotation occurrences,0,0,169.094,首饰\r
,coffee machine,annotation occurrences,0,7.891,157.821,咖啡机\r
,lead,annotation occurrences,0,7.891,157.821,引线\r
,cube,annotation occurrences,0,7.891,157.821,立方体\r
,stopper,annotation occurrences,0,7.891,157.821,塞子\r
,garlic,annotation occurrences,0,7.891,157.821,大蒜\r
,almond,annotation occurrences,0,7.891,157.821,杏仁\r
,newspaper,annotation occurrences,37.421,112.825,11.273,报纸\r
,cuticle pusher,annotation occurrences,0,0,157.821,死皮推棒\r
,puff,annotation occurrences,0,7.327,146.548,粉扑\r
,letter,annotation occurrences,0,7.327,146.548,信件\r
,grain,annotation occurrences,0,7.327,146.548,谷物\r
,pipe,annotation occurrences,0,7.327,146.548,管道\r
,roller,annotation occurrences,0,7.327,146.548,滚轮\r
,chassis,annotation occurrences,0,7.327,146.548,底盘\r
,cucumber,annotation occurrences,0,7.327,146.548,黄瓜\r
,cutter,annotation occurrences,0,7.327,146.548,切割器\r
,basketball,annotation occurrences,0,0,146.548,篮球\r
,sweatshirt,annotation occurrences,0,6.764,135.275,卫衣\r
,residue,annotation occurrences,0,6.764,135.275,残留物\r
,core,annotation occurrences,0,6.764,135.275,芯体\r
,switch,annotation occurrences,0,6.764,135.275,开关\r
,petal,annotation occurrences,0,6.764,135.275,花瓣\r
,token,annotation occurrences,0,6.764,135.275,代币\r
,spring,annotation occurrences,0,6.764,135.275,弹簧\r
,colander,annotation occurrences,0,6.764,135.275,滤水篮\r
,wok,annotation occurrences,0,6.764,135.275,炒锅\r
,seal,annotation occurrences,0,6.764,135.275,密封件\r
,eyeliner,annotation occurrences,0,0,135.275,眼线笔\r
,foil,annotation occurrences,0,6.2,124.002,锡箔纸\r
,pepper,annotation occurrences,0,6.2,124.002,辣椒\r
,headband,annotation occurrences,0,6.2,124.002,头带\r
,motor,annotation occurrences,0,6.2,124.002,电机\r
,bathrobe,annotation occurrences,0,6.2,124.002,浴袍\r
,wallet,annotation occurrences,0,6.2,124.002,钱包\r
,shovel,annotation occurrences,0,5.636,112.729,铲子\r
,showerhead,annotation occurrences,0,5.636,112.729,花洒\r
,coffee,annotation occurrences,0,5.636,112.729,咖啡\r
,generator,annotation occurrences,0,5.636,112.729,发电机\r
,lotion,annotation occurrences,0,5.636,112.729,乳液\r
,seed,annotation occurrences,0,5.636,112.729,种子\r
,cream,annotation occurrences,0,5.636,112.729,面霜\r
,cone,annotation occurrences,0,5.636,112.729,锥体\r
,anvil,annotation occurrences,0,5.073,101.457,铁砧\r
,first aid kit,annotation occurrences,0,5.073,101.457,急救箱\r
,flier,annotation occurrences,0,5.073,101.457,传单\r
,sweater,annotation occurrences,0,5.073,101.457,毛衣\r
,pulley,annotation occurrences,0,5.073,101.457,滑轮\r
,light string,annotation occurrences,0,5.073,101.457,灯串\r
,cake,annotation occurrences,0,5.073,101.457,蛋糕\r
,blender,annotation occurrences,0,5.073,101.457,搅拌机\r
,peanut,annotation occurrences,0,5.073,101.457,花生\r
,rotor,annotation occurrences,0,5.073,101.457,转子\r
,teapot,annotation occurrences,0,5.073,101.457,茶壶\r
,banknote,annotation occurrences,0,5.073,101.457,纸币\r
,herb,annotation occurrences,0,5.073,101.457,香草\r
,hub,annotation occurrences,0,5.073,101.457,轮毂\r
,eggshell,annotation occurrences,0,5.073,101.457,蛋壳\r
,blush,annotation occurrences,0,0,101.457,腮红\r
,divider,annotation occurrences,0,4.509,90.184,分隔板\r
,coil,annotation occurrences,0,4.509,90.184,线圈\r
,toothpick,annotation occurrences,0,4.509,90.184,牙签\r
,paintbrush,annotation occurrences,0,4.509,90.184,画笔\r
,bean,annotation occurrences,0,4.509,90.184,豆子\r
,croissant,annotation occurrences,0,4.509,90.184,牛角包\r
,fruit,annotation occurrences,0,4.509,90.184,水果\r
,cleaning agent,annotation occurrences,0,4.509,90.184,清洁剂\r
,nib,annotation occurrences,0,4.509,90.184,笔尖\r
,notepad,annotation occurrences,0,4.509,90.184,记事本\r
,portafilter,annotation occurrences,0,4.509,90.184,咖啡粉碗手柄\r
,scalpel,annotation occurrences,0,4.509,90.184,手术刀\r
,sock,annotation occurrences,0,4.509,90.184,袜子\r
,locker,annotation occurrences,0,4.509,90.184,储物柜\r
,gel,annotation occurrences,0,4.509,90.184,凝胶\r
,adapter,annotation occurrences,0,4.509,90.184,适配器\r
,brooch,annotation occurrences,0,0,90.184,胸针\r
,carrot,annotation occurrences,0,3.946,78.911,胡萝卜\r
,reflector,annotation occurrences,0,3.946,78.911,反光板\r
,tamper,annotation occurrences,0,3.946,78.911,压粉器\r
,lens,annotation occurrences,0,3.946,78.911,镜头\r
,net,annotation occurrences,0,3.946,78.911,网\r
,onion,annotation occurrences,0,3.946,78.911,洋葱\r
,cleaning supplies,annotation occurrences,0,3.946,78.911,清洁用品\r
,dust,annotation occurrences,0,3.946,78.911,灰尘\r
,electric drill,annotation occurrences,0,3.946,78.911,电钻\r
,menu,annotation occurrences,0,3.946,78.911,菜单\r
,router,annotation occurrences,0,3.946,78.911,路由器\r
,spool,annotation occurrences,0,3.946,78.911,线轴\r
,peg,annotation occurrences,0,3.946,78.911,木钉\r
,filler,annotation occurrences,0,3.946,78.911,填充料\r
,turntable,annotation occurrences,0,3.946,78.911,转盘\r
,steamer,annotation occurrences,0,3.946,78.911,蒸汽机\r
,toilet,annotation occurrences,0,3.946,78.911,马桶\r
,conditioner,annotation occurrences,0,0,78.911,护发素\r
,nipple,annotation occurrences,0,0,78.911,奶嘴\r
,dispenser,annotation occurrences,0,3.382,67.638,分配器\r
,keychain,annotation occurrences,0,3.382,67.638,钥匙扣\r
,plug,annotation occurrences,0,3.382,67.638,插头\r
,chalk,annotation occurrences,0,3.382,67.638,粉笔\r
,compressor,annotation occurrences,0,3.382,67.638,压缩机\r
,engine,annotation occurrences,0,3.382,67.638,发动机\r
,headboard,annotation occurrences,0,3.382,67.638,床头板\r
,paint,annotation occurrences,0,3.382,67.638,颜料\r
,stuffing,annotation occurrences,0,3.382,67.638,填充物\r
,wristband,annotation occurrences,0,3.382,67.638,腕带\r
,cpu,annotation occurrences,0,3.382,67.638,处理器\r
,oil,annotation occurrences,0,3.382,67.638,油\r
,usb drive,annotation occurrences,0,3.382,67.638,U盘\r
,lace,annotation occurrences,0,3.382,67.638,花边\r
,coin,annotation occurrences,0,3.382,67.638,硬币\r
,lock,annotation occurrences,0,3.382,67.638,锁\r
,apple,annotation occurrences,0,3.382,67.638,苹果\r
,buckle,annotation occurrences,0,3.382,67.638,搭扣\r
,pin,annotation occurrences,0,2.818,56.365,销钉\r
,starter,annotation occurrences,0,2.818,56.365,启动器\r
,medicine,annotation occurrences,0,2.818,56.365,药品\r
,clove,annotation occurrences,0,2.818,56.365,丁香\r
,pedal,annotation occurrences,0,2.818,56.365,踏板\r
,express waybill,annotation occurrences,0,2.818,56.365,快递面单\r
,granules,annotation occurrences,0,2.818,56.365,颗粒物\r
,handcart,annotation occurrences,0,2.818,56.365,手推货车\r
,hay,annotation occurrences,0,2.818,56.365,干草\r
,matchbox,annotation occurrences,0,2.818,56.365,火柴盒\r
,ribbon,annotation occurrences,0,2.818,56.365,丝带\r
,rose,annotation occurrences,0,2.818,56.365,玫瑰\r
,gear,annotation occurrences,0,2.818,56.365,齿轮\r
,photo,annotation occurrences,0,2.818,56.365,照片\r
,alarm,annotation occurrences,0,2.818,56.365,闹钟\r
,tea,annotation occurrences,0,2.818,56.365,茶叶\r
,mouthwash,annotation occurrences,0,0,56.365,漱口水\r
,eyeshadow,annotation occurrences,0,0,56.365,眼影\r
,bangle,annotation occurrences,0,0,56.365,手镯\r
,handkerchief,annotation occurrences,0,0,45.092,手帕\r
,vegetable,annotation occurrences,0,0,45.092,蔬菜\r
,ornament,annotation occurrences,0,0,45.092,装饰品\r
,picture,annotation occurrences,0,0,45.092,图片\r
,rice,annotation occurrences,0,0,45.092,米饭\r
,chain,annotation occurrences,0,0,45.092,链条\r
,utensil,annotation occurrences,0,0,45.092,器具\r
,bead,annotation occurrences,0,0,45.092,珠子\r
,fries,annotation occurrences,0,0,45.092,薯条\r
,map,annotation occurrences,0,0,45.092,地图\r
,ingredient,annotation occurrences,0,0,45.092,食材\r
,insole,annotation occurrences,0,0,45.092,鞋垫\r
,iron,annotation occurrences,0,0,45.092,熨斗\r
,main unit,annotation occurrences,0,0,45.092,主机\r
,cage,annotation occurrences,0,0,45.092,笼子\r
,shredder,annotation occurrences,0,0,45.092,碎纸机\r
,sauce,annotation occurrences,0,0,45.092,酱料\r
,appliance,annotation occurrences,0,0,45.092,电器\r
,bandage,annotation occurrences,0,0,45.092,绷带\r
,butter,annotation occurrences,0,0,45.092,黄油\r
,cabbage,annotation occurrences,0,0,45.092,卷心菜\r
,compass,annotation occurrences,0,0,45.092,指南针\r
,stator,annotation occurrences,0,0,45.092,定子\r
,tile,annotation occurrences,0,0,45.092,瓷砖\r
,timer,annotation occurrences,0,0,45.092,计时器\r
,pegs,annotation occurrences,0,0,45.092,木钉\r
,facial cleanser,annotation occurrences,0,0,45.092,洗面奶\r
,hula hoop,annotation occurrences,0,0,45.092,呼啦圈\r
,lip balm,annotation occurrences,0,0,45.092,润唇膏\r
,mascara,annotation occurrences,0,0,45.092,睫毛膏\r
,skirt,annotation occurrences,0,0,33.819,裙子\r
,mushroom,annotation occurrences,0,0,33.819,蘑菇\r
,diffuser,annotation occurrences,0,0,33.819,扩散器\r
,cooler,annotation occurrences,0,0,33.819,冷却器\r
,crossbar,annotation occurrences,0,0,33.819,横杆\r
,grille,annotation occurrences,0,0,33.819,格栅\r
,bulb,annotation occurrences,0,0,33.819,灯泡\r
,oven,annotation occurrences,0,0,33.819,烤箱\r
,support,annotation occurrences,0,0,33.819,支撑件\r
,whisk,annotation occurrences,0,0,33.819,打蛋器\r
,bathtub,annotation occurrences,0,0,33.819,浴缸\r
,camisole,annotation occurrences,0,0,33.819,吊带背心\r
,cardigan,annotation occurrences,0,0,33.819,开衫\r
,flowerpot,annotation occurrences,0,0,33.819,花盆\r
,gasket,annotation occurrences,0,0,33.819,密封垫片\r
,hairband,annotation occurrences,0,0,33.819,发带\r
,hairpin,annotation occurrences,0,0,33.819,发夹\r
,humidifier,annotation occurrences,0,0,33.819,加湿器\r
,jelly,annotation occurrences,0,0,33.819,果冻\r
,knot,annotation occurrences,0,0,33.819,绳结\r
,latch,annotation occurrences,0,0,33.819,门闩\r
,disk,annotation occurrences,0,0,33.819,磁盘\r
,schoolbag,annotation occurrences,0,0,33.819,书包\r
,sepal,annotation occurrences,0,0,33.819,花萼\r
,spinner,annotation occurrences,0,0,33.819,旋转器\r
,sportswear,annotation occurrences,0,0,33.819,运动服\r
,wool,annotation occurrences,0,0,33.819,羊毛\r
,sterilizer,annotation occurrences,0,0,33.819,消毒器\r
,track,annotation occurrences,0,0,33.819,轨道\r
,tripod,annotation occurrences,0,0,33.819,三脚架\r
,window,annotation occurrences,0,0,33.819,窗户\r
,stepper,annotation occurrences,0,0,33.819,踏步机\r
,pendant,annotation occurrences,0,0,33.819,吊坠\r
,diaper,annotation occurrences,0,0,33.819,尿布\r
,grip strengthener,annotation occurrences,0,0,33.819,握力器\r
,backrest,annotation occurrences,0,0,22.546,靠背\r
,badge,annotation occurrences,0,0,22.546,徽章\r
,banana,annotation occurrences,0,0,22.546,香蕉\r
,bookend,annotation occurrences,0,0,22.546,书立\r
,button,annotation occurrences,0,0,22.546,纽扣\r
,clothespin,annotation occurrences,0,0,22.546,晾衣夹\r
,decoration,annotation occurrences,0,0,22.546,装饰物\r
,painting,annotation occurrences,0,0,22.546,绘画作品\r
,duster,annotation occurrences,0,0,22.546,除尘掸\r
,filling,annotation occurrences,0,0,22.546,馅料\r
,receipt,annotation occurrences,0,0,22.546,收据\r
,wheel,annotation occurrences,0,0,22.546,轮子\r
,brace,annotation occurrences,0,0,22.546,撑杆\r
,yam,annotation occurrences,0,0,22.546,山药\r
,album,annotation occurrences,0,0,22.546,相册\r
,balloon,annotation occurrences,0,0,22.546,气球\r
,camera,annotation occurrences,0,0,22.546,相机\r
,cardstock,annotation occurrences,0,0,22.546,卡纸\r
,care solution,annotation occurrences,0,0,22.546,护理液\r
,cigarette butt,annotation occurrences,0,0,22.546,烟头\r
,corn kernels,annotation occurrences,0,0,22.546,玉米粒\r
,correction fluid,annotation occurrences,0,0,22.546,修正液\r
,daliyuan pie,annotation occurrences,0,0,22.546,达利园派\r
,earplug,annotation occurrences,0,0,22.546,耳塞\r
,electric griddle,annotation occurrences,0,0,22.546,电饼铛\r
,express delivery slip,annotation occurrences,0,0,22.546,快递单\r
,fire extinguisher,annotation occurrences,0,0,22.546,灭火器\r
,grinding trough,annotation occurrences,0,0,22.546,研磨槽\r
,lampshade,annotation occurrences,0,0,22.546,灯罩\r
,mortar,annotation occurrences,0,0,22.546,研钵\r
,pestle,annotation occurrences,0,0,22.546,研杵\r
,pillar,annotation occurrences,0,0,22.546,立柱\r
,radish,annotation occurrences,0,0,22.546,萝卜\r
,scarf,annotation occurrences,0,0,22.546,围巾\r
,slips,annotation occurrences,0,0,22.546,纸条\r
,syrup,annotation occurrences,0,0,22.546,糖浆\r
,television,annotation occurrences,0,0,22.546,电视机\r
,thermometer,annotation occurrences,0,0,22.546,温度计\r
,vanity,annotation occurrences,0,0,22.546,梳妆台\r
,washbasin,annotation occurrences,0,0,22.546,洗脸盆\r
,zucchini,annotation occurrences,0,0,22.546,西葫芦\r
,makeup,annotation occurrences,0,0,22.546,化妆品\r
,blood lancet,annotation occurrences,0,0,22.546,采血针\r
,comedone extractor,annotation occurrences,0,0,22.546,粉刺针\r
,concealer,annotation occurrences,0,0,22.546,遮瑕膏\r
,perfume,annotation occurrences,0,0,22.546,香水\r
,scoreboard,annotation occurrences,0,0,22.546,记分牌\r
,sunscreen,annotation occurrences,0,0,22.546,防晒霜\r
,wig,annotation occurrences,0,0,22.546,假发\r
,adhesive backing,annotation occurrences,0,0,11.273,背胶\r
,blower,annotation occurrences,0,0,11.273,吹风机\r
,air column,annotation occurrences,0,0,11.273,气柱袋\r
,clock,annotation occurrences,0,0,11.273,时钟\r
,armchair,annotation occurrences,0,0,11.273,扶手椅\r
,backboard,annotation occurrences,0,0,11.273,背板\r
,skewer,annotation occurrences,0,0,11.273,竹签\r
,barrier,annotation occurrences,0,0,11.273,隔离栏\r
,bedding,annotation occurrences,0,0,11.273,床上用品\r
,bell,annotation occurrences,0,0,11.273,铃铛\r
,bitter melon,annotation occurrences,0,0,11.273,苦瓜\r
,blueprint,annotation occurrences,0,0,11.273,蓝图\r
,bow,annotation occurrences,0,0,11.273,蝴蝶结\r
,bubble mailer,annotation occurrences,0,0,11.273,气泡快递袋\r
,calyx,annotation occurrences,0,0,11.273,花萼\r
,cauliflower,annotation occurrences,0,0,11.273,花椰菜\r
,cereal,annotation occurrences,0,0,11.273,谷物早餐\r
,chicken essence seasoning,annotation occurrences,0,0,11.273,鸡精调味料\r
,chicken-flavor essence,annotation occurrences,0,0,11.273,鸡味精\r
,chive,annotation occurrences,0,0,11.273,韭菜\r
,cola,annotation occurrences,0,0,11.273,可乐\r
,corkboard,annotation occurrences,0,0,11.273,软木公告板\r
,corner guard,annotation occurrences,0,0,11.273,护角\r
,date slices,annotation occurrences,0,0,11.273,枣片\r
,dice,annotation occurrences,0,0,11.273,骰子\r
,dishcloth,annotation occurrences,0,0,11.273,洗碗布\r
,doormat,annotation occurrences,0,0,11.273,门垫\r
,dummy,annotation occurrences,0,0,11.273,假人模型\r
,expander,annotation occurrences,0,0,11.273,扩胸器\r
,eyelash,annotation occurrences,0,0,11.273,睫毛\r
,fragrance sachet,annotation occurrences,0,0,11.273,香包\r
,freezer,annotation occurrences,0,0,11.273,冷冻柜\r
,french press body,annotation occurrences,0,0,11.273,法压壶壶身\r
,game controller,annotation occurrences,0,0,11.273,游戏手柄\r
,gauze,annotation occurrences,0,0,11.273,纱布\r
,globe,annotation occurrences,0,0,11.273,地球仪\r
,goggles,annotation occurrences,0,0,11.273,护目镜\r
,gourd,annotation occurrences,0,0,11.273,葫芦\r
,graffiti,annotation occurrences,0,0,11.273,涂鸦\r
,ham,annotation occurrences,0,0,11.273,火腿\r
,hardboard,annotation occurrences,0,0,11.273,硬纸板\r
,headset,annotation occurrences,0,0,11.273,头戴式耳机\r
,helmet,annotation occurrences,0,0,11.273,头盔\r
,hotels,annotation occurrences,0,0,11.273,酒店（场所）\r
,hygrometer,annotation occurrences,0,0,11.273,湿度计\r
,i o shield,annotation occurrences,0,0,11.273,主板I/O挡板\r
,ice maker,annotation occurrences,0,0,11.273,制冰机\r
,induction cooker,annotation occurrences,0,0,11.273,电磁炉\r
,inner layer,annotation occurrences,0,0,11.273,内层材料\r
,insecticide aerosol,annotation occurrences,0,0,11.273,杀虫喷雾剂\r
,keyhole,annotation occurrences,0,0,11.273,锁孔\r
,keypad,annotation occurrences,0,0,11.273,数字键盘\r
,lettuce,annotation occurrences,0,0,11.273,生菜\r
,line,annotation occurrences,0,0,11.273,线条\r
,linen,annotation occurrences,0,0,11.273,亚麻织物\r
,lotus root,annotation occurrences,0,0,11.273,莲藕\r
,luffa,annotation occurrences,0,0,11.273,丝瓜\r
,grid,annotation occurrences,0,0,11.273,网格\r
,mold,annotation occurrences,0,0,11.273,模具\r
,microphone,annotation occurrences,0,0,11.273,麦克风\r
,microscope,annotation occurrences,0,0,11.273,显微镜\r
,monosodium glutamate,annotation occurrences,0,0,11.273,味精\r
,mosquito repellent,annotation occurrences,0,0,11.273,驱蚊剂\r
,nba special issue,annotation occurrences,0,0,11.273,NBA特刊\r
,oat toast,annotation occurrences,0,0,11.273,燕麦吐司\r
,parcel,annotation occurrences,0,0,11.273,包裹\r
,peach,annotation occurrences,0,0,11.273,桃子\r
,pickled mustard tuber slices,annotation occurrences,0,0,11.273,榨菜片\r
,pigment,annotation occurrences,0,0,11.273,颜料\r
,hole,annotation occurrences,0,0,11.273,孔洞\r
,houses,annotation occurrences,0,0,11.273,房屋（场所）\r
,skeleton,annotation occurrences,0,0,11.273,骨架\r
,pulp mold,annotation occurrences,0,0,11.273,纸浆模具\r
,raisin,annotation occurrences,0,0,11.273,葡萄干\r
,sachima,annotation occurrences,0,0,11.273,沙琪玛\r
,safe,annotation occurrences,0,0,11.273,保险柜\r
,salt,annotation occurrences,0,0,11.273,盐\r
,sensor,annotation occurrences,0,0,11.273,传感器\r
,guide,annotation occurrences,0,0,11.273,导向件\r
,shoebox,annotation occurrences,0,0,11.273,鞋盒\r
,skimmer,annotation occurrences,0,0,11.273,漏勺\r
,soap dispenser,annotation occurrences,0,0,11.273,皂液器\r
,soybean paste,annotation occurrences,0,0,11.273,豆瓣酱\r
,speaker,annotation occurrences,0,0,11.273,扬声器\r
,spork,annotation occurrences,0,0,11.273,勺叉两用餐具\r
,stain,annotation occurrences,0,0,11.273,污渍\r
,kitchenware,annotation occurrences,0,0,11.273,厨具\r
,story,annotation occurrences,0,0,11.273,故事文本\r
,suction head,annotation occurrences,0,0,11.273,吸头\r
,sugar-free pickled mustard tubers,annotation occurrences,0,0,11.273,无糖榨菜\r
,suit,annotation occurrences,0,0,11.273,西装\r
,syringe,annotation occurrences,0,0,11.273,注射器\r
,tail,annotation occurrences,0,0,11.273,尾部\r
,test instrument,annotation occurrences,0,0,11.273,测试仪器\r
,thermostat,annotation occurrences,0,0,11.273,恒温器\r
,thumbtack,annotation occurrences,0,0,11.273,图钉\r
,transformer,annotation occurrences,0,0,11.273,变压器\r
,velcro,annotation occurrences,0,0,11.273,魔术贴\r
,vinegar,annotation occurrences,0,0,11.273,醋\r
,body wash samples,annotation occurrences,0,0,11.273,沐浴露试用装\r
,mannequin head,annotation occurrences,0,0,11.273,假人头模\r
,pacifier,annotation occurrences,0,0,11.273,安抚奶嘴\r
,baby supplies,annotation occurrences,0,0,11.273,婴儿用品\r
`,Ur=`\uFEFFpanel,bin,level,count,percentage\r
duration,0-10 s,L1,0.0,0.0\r
duration,0-10 s,L2,0.0,0.0\r
duration,0-10 s,L3,0.0,0.0\r
duration,10-20 s,L1,96.7093514882402,0.03474930073216174\r
duration,10-20 s,L2,3841.8802110258725,3.6807567725307835\r
duration,10-20 s,L3,1279.014914483822,4.241601974925823\r
duration,20-30 s,L1,3032.3624969656144,1.089578977776521\r
duration,20-30 s,L2,12160.1470441686,11.650166358477422\r
duration,20-30 s,L3,4002.842973106772,13.274643217823396\r
duration,30-40 s,L1,18896.933133435046,6.789986720665113\r
duration,30-40 s,L2,11557.163768189715,11.072471413587552\r
duration,30-40 s,L3,3537.43903717267,11.731222393373496\r
duration,40-50 s,L1,30565.66316040136,10.9827581810214\r
duration,40-50 s,L2,13541.426128258357,12.973516401752432\r
duration,40-50 s,L3,4004.3809900794627,13.279743749298797\r
duration,50-60 s,L1,32458.75136390286,11.662976694367346\r
duration,50-60 s,L2,13139.608659651196,12.588550632998787\r
duration,50-60 s,L3,3838.8903638186885,12.730926562547932\r
duration,60-70 s,L1,24942.75054878872,8.962350864409911\r
duration,60-70 s,L2,13660.78011736468,13.087864840433802\r
duration,60-70 s,L3,4137.880863308413,13.722469881361759\r
duration,70-80 s,L1,18516.08047924414,6.653139939961274\r
duration,70-80 s,L2,10083.772286110452,9.660872045994491\r
duration,70-80 s,L3,3052.656087382744,10.123534872333781\r
duration,80-90 s,L1,16395.889483199768,5.891319563778455\r
duration,80-90 s,L2,7464.027796153877,7.150996218519627\r
duration,80-90 s,L3,2214.744440664625,7.3447653245468745\r
duration,90-100 s,L1,12866.051116284165,4.622989117339796\r
duration,90-100 s,L2,4795.948382060386,4.594812570499986\r
duration,90-100 s,L3,1384.2152754153906,4.5904783278417955\r
duration,100-110 s,L1,10703.9138954979,3.8460967552972445\r
duration,100-110 s,L2,3026.783190522597,2.899843856538024\r
duration,100-110 s,L3,830.5291652492347,2.754286996705079\r
duration,110-120 s,L1,11899.063526211765,4.275534170588549\r
duration,110-120 s,L2,1824.1363408794582,1.7476344450934187\r
duration,110-120 s,L3,409.72772152295573,1.358781585041172\r
duration,120-130 s,L1,9561.408895331273,3.435575443471301\r
duration,120-130 s,L2,1726.6326231912428,1.6542199059836746\r
duration,120-130 s,L3,416.1873928082275,1.3802038172377669\r
duration,130-140 s,L1,7642.369113389898,2.746032090388515\r
duration,130-140 s,L2,1163.7386811873864,1.114933000759213\r
duration,130-140 s,L3,260.5400751726302,0.8640300319293337\r
duration,140-150 s,L1,6154.443307962433,2.211395258641895\r
duration,140-150 s,L2,937.0787106203209,0.8977788533362818\r
duration,140-150 s,L3,209.78551507406587,0.6957124932418011\r
duration,150-160 s,L1,5246.773611464391,1.8852542312882397\r
duration,150-160 s,L2,942.4497858939831,0.9029246727276745\r
duration,150-160 s,L3,226.70370177358734,0.7518183394709786\r
duration,160-170 s,L1,5006.747992108039,1.7990089788686585\r
duration,160-170 s,L2,554.8647601967895,0.5315944568161467\r
duration,160-170 s,L3,101.50912019712868,0.3366350773750652\r
duration,170-180 s,L1,5588.16927394697,2.007923449535508\r
duration,170-180 s,L2,573.7849122690226,0.5497211224204834\r
duration,170-180 s,L3,98.12548285722437,0.3254139081292296\r
duration,180-190 s,L1,5612.637905046401,2.0167154412870176\r
duration,180-190 s,L2,382.1410154494497,0.36611452034361214\r
duration,180-190 s,L3,33.836373399042884,0.11221169245835502\r
duration,190-200 s,L1,4336.77356914735,1.5582758713868192\r
duration,190-200 s,L2,399.5550948121994,0.38279827596094673\r
duration,190-200 s,L3,60.905472118277196,0.20198104642503906\r
duration,200-210 s,L1,3542.1256448704903,1.272745472599661\r
duration,200-210 s,L2,177.10628224352448,0.16967867606979148\r
duration,200-210 s,L3,0.0,0.0\r
duration,210-220 s,L1,2776.607043331047,0.9976817306595374\r
duration,210-220 s,L2,220.037648324255,0.2108095567261283\r
duration,210-220 s,L3,27.06909871923431,0.08976935396668403\r
duration,220-230 s,L1,2754.4687580506047,0.9897270714557889\r
duration,220-230 s,L2,137.72343790253007,0.13194749678585085\r
duration,220-230 s,L3,0.0,0.0\r
duration,230-240 s,L1,2782.4329078785295,0.9997750620289441\r
duration,230-240 s,L2,220.32894155162924,0.21108863349597992\r
duration,230-240 s,L3,27.06909871923431,0.08976935396668403\r
duration,240-250 s,L1,2660.0897523813574,0.9558151032713896\r
duration,240-250 s,L2,133.0044876190677,0.1274264531142544\r
duration,240-250 s,L3,0.0,0.0\r
duration,250-260 s,L1,2503.956582508775,0.8997138225712726\r
duration,250-260 s,L2,125.19782912543873,0.11994719568223078\r
duration,250-260 s,L3,0.0,0.0\r
duration,260-270 s,L1,2090.3201996373878,0.7510872953433524\r
duration,260-270 s,L2,104.51600998186927,0.10013274502276501\r
duration,260-270 s,L3,0.0,0.0\r
duration,270-280 s,L1,1692.996237498954,0.6083220959497719\r
duration,270-280 s,L2,84.64981187494776,0.08109970931888393\r
duration,270-280 s,L3,0.0,0.0\r
duration,280-290 s,L1,1905.0577070273862,0.6845193577961994\r
duration,280-290 s,L2,95.25288535136919,0.09125810374148319\r
duration,280-290 s,L3,0.0,0.0\r
duration,290-300 s,L1,1960.9860066832355,0.7046153389425097\r
duration,290-300 s,L2,98.04930033416173,0.09393724073205889\r
duration,290-300 s,L3,0.0,0.0\r
duration,>300 s,L1,24113.35928684757,8.66433659854727\r
duration,>300 s,L2,1205.6679643424015,1.155103824539003\r
duration,>300 s,L3,0.0,0.0\r
subtask,0,L1,0.0,0.0\r
subtask,0,L2,0.0,0.0\r
subtask,0,L3,0.0,0.0\r
subtask,1,L1,0.0,0.0\r
subtask,1,L2,91.3582081774158,0.08752676424169642\r
subtask,1,L3,30.4527360591386,0.10099052321251953\r
subtask,2,L1,22.403097305326177,0.00804981062963002\r
subtask,2,L2,96.63100886892828,0.09257843055856661\r
subtask,2,L3,31.836951334553987,0.10558100154036132\r
subtask,3,L1,0.0,0.0\r
subtask,3,L2,944.0348178332966,0.9044432304975296\r
subtask,3,L3,314.67827261109886,1.0435687398627018\r
subtask,4,L1,9506.53984377501,3.415860068028535\r
subtask,4,L2,8002.228254805842,7.666625252833901\r
subtask,4,L3,2508.9670875390316,8.32049699578703\r
subtask,5,L1,0.0,0.0\r
subtask,5,L2,13597.146650405375,13.026900077972472\r
subtask,5,L3,4532.382216801801,15.030756204796681\r
subtask,6,L1,44979.752411762565,16.161983503783254\r
subtask,6,L2,16759.71635276761,16.056835737382876\r
subtask,6,L3,4836.909577393188,16.040661436921873\r
subtask,7,L1,0.0,0.0\r
subtask,7,L2,11988.227095280898,11.485456507715943\r
subtask,7,L3,3996.075698426971,13.252200879331749\r
subtask,8,L1,59222.82605745312,21.2797600357106\r
subtask,8,L2,14705.7465096805,14.089006706998267\r
subtask,8,L3,3914.8684022692664,12.982892817431694\r
subtask,9,L1,0.0,0.0\r
subtask,9,L2,7276.358297766899,6.971197333795715\r
subtask,9,L3,2425.4527659223018,8.043538136673904\r
subtask,10,L1,49511.69244325089,17.790385976045307\r
subtask,10,L2,9821.15368370019,9.409267324785334\r
subtask,10,L3,2448.5230205125586,8.120046108804603\r
subtask,11,L1,0.0,0.0\r
subtask,11,L2,3451.310086702375,3.3065666491307537\r
subtask,11,L3,1150.4366955674584,3.8151975435840724\r
subtask,12,L1,36800.23858709404,13.22294626113518\r
subtask,12,L2,5531.252663795683,5.299279150978138\r
subtask,12,L3,1230.4135781470143,4.08042518030382\r
subtask,13,L1,0.0,0.0\r
subtask,13,L2,2376.2362227964213,2.276579979013821\r
subtask,13,L3,792.0787409321404,2.6267737098205837\r
subtask,14,L1,18704.520716153118,6.720849694619137\r
subtask,14,L2,2674.723231913006,2.562548832796735\r
subtask,14,L3,579.8323987017803,1.9229003662181747\r
subtask,15,L1,0.0,0.0\r
subtask,15,L2,1093.5300675781589,1.0476688447112148\r
subtask,15,L3,364.5100225260529,1.2088259596650064\r
subtask,16,L1,15670.410459823348,5.630642717431826\r
subtask,16,L2,1650.9620955848127,1.5817229014781715\r
subtask,16,L3,289.14719086454835,0.9588999173713977\r
subtask,17,L1,0.0,0.0\r
subtask,17,L2,258.38685141087296,0.24755044431994944\r
subtask,17,L3,86.12895047029099,0.2856297626212674\r
subtask,18,L1,8962.298170229995,3.220304857555529\r
subtask,18,L2,1138.3769258519767,1.0906348843197233\r
subtask,18,L3,230.08733911349162,0.7630395087168143\r
subtask,19,L1,0.0,0.0\r
subtask,19,L2,247.31312920754982,0.2369411395633802\r
subtask,19,L3,82.43770973584995,0.2733884870803559\r
subtask,20,L1,6524.438669132681,2.3443408308844425\r
subtask,20,L2,591.9912663363897,0.5671639257760468\r
subtask,20,L3,88.58977762658502,0.29379061298187503\r
subtask,21,L1,0.0,0.0\r
subtask,21,L2,243.62188847310878,0.23340470464452376\r
subtask,21,L3,81.20729615770293,0.2693080619000521\r
subtask,22,L1,4908.555693280433,1.7637268301515547\r
subtask,22,L2,245.42778466402177,0.23513486390771837\r
subtask,22,L3,0.0,0.0\r
subtask,23,L1,0.0,0.0\r
subtask,23,L2,81.20729615770293,0.07780156821484124\r
subtask,23,L3,27.06909871923431,0.08976935396668403\r
subtask,24,L1,3806.9376697561233,1.3678968984818054\r
subtask,24,L2,275.2454203799506,0.2637019869240173\r
subtask,24,L3,28.29951229738132,0.09384977914698783\r
subtask,25,L1,0.0,0.0\r
subtask,25,L2,88.58977762658502,0.0848744380525541\r
subtask,25,L3,29.52992587552834,0.09793020432729167\r
subtask,26,L1,2405.5524340612637,0.8643555527134641\r
subtask,26,L2,120.27762170306346,0.11523333533328248\r
subtask,26,L3,0.0,0.0\r
subtask,27,L1,0.0,0.0\r
subtask,27,L2,0.0,0.0\r
subtask,27,L3,0.0,0.0\r
subtask,28,L1,2016.2787574793572,0.7244829566667021\r
subtask,28,L2,100.81393787396799,0.09658593298410531\r
subtask,28,L3,0.0,0.0\r
subtask,29,L1,0.0,0.0\r
subtask,29,L2,0.0,0.0\r
subtask,29,L3,0.0,0.0\r
subtask,30,L1,2144.4477775240125,0.7705362467936633\r
subtask,30,L2,188.42968503390375,0.1805271901356825\r
subtask,30,L3,27.06909871923431,0.08976935396668403\r
subtask,>30,L1,13118.999562455385,4.713877759342587\r
subtask,>30,L2,737.1572742804436,0.7062418609359924\r
subtask,>30,L3,27.06909871923431,0.08976935396668403\r
`,tn=["L1","L2","L3"],D=n=>{const r=Number(n);return Number.isFinite(r)?r:0};function Un(n){const r=[];let i=[],u="",L=!1;for(let d=0;d<n.length;d+=1){const v=n[d];if(L){v==='"'?n[d+1]==='"'?(u+='"',d+=1):L=!1:u+=v;continue}v==='"'?L=!0:v===","?(i.push(u),u=""):v===`
`?(i.push(u),r.push(i),i=[],u=""):v!=="\r"&&(u+=v)}(u||i.length)&&(i.push(u),r.push(i));const[_,...f]=r.filter(d=>d.some(v=>v.trim()!==""));return _?f.map(d=>{const v={};return _.forEach(($,g)=>{v[$.trim()]=(d[g]??"").trim()}),v}):[]}const qr=[{id:"L1",name:{en:"Visual intention",zh:"视觉意图"},color:"var(--c-blue)",tint:"var(--t-blue)",question:{en:"What was seen",zh:"看到了什么"},adds:{en:"Four-lens headband",zh:"四目头带"},setting:{open:100,controlled:0}},{id:"L2",name:{en:"Motor intention",zh:"动作意图"},color:"var(--c-teal)",tint:"var(--t-teal)",question:{en:"How the body executed",zh:"身体如何执行"},adds:{en:"Wrist cameras · surface EMG",zh:"腕部相机 · 表面肌电"},setting:{open:60,controlled:40}},{id:"L3",name:{en:"Cognitive intention",zh:"认知意图"},color:"var(--c-violet)",tint:"var(--t-violet)",question:{en:"What the brain decided",zh:"大脑决定了什么"},adds:{en:"EEG · eye tracker · gloves",zh:"脑电 · 眼动 · 手套"},setting:{open:30,controlled:70}}],Hr=[{id:"residential",name:{en:"Residential",zh:"居住"}},{id:"commercial",name:{en:"Commercial",zh:"商业"}},{id:"professional",name:{en:"Professional",zh:"专业"}},{id:"industrial",name:{en:"Industrial",zh:"工业"}},{id:"public",name:{en:"Public",zh:"公共"}},{id:"other",name:{en:"Residual",zh:"残余类"}}],Zr={kitchen:"厨房",living_room:"客厅",dining_room:"餐厅",storage_room:"储藏室",bathroom:"浴室",bedroom:"卧室",study_room:"书房",laundry_area:"洗衣区",balcony:"阳台",retail_store:"零售店",logistics_facility:"物流中心",entertainment_venue:"娱乐场所",restaurant:"餐馆",beverage_shop:"饮品店",pet_shop:"宠物店",hotel:"酒店",performance_venue:"演出场所",hair_salon:"理发店",beauty_salon:"美容院",office:"办公室",classroom:"教室",laboratory:"实验室",healthcare_facility:"医疗机构",conference_center:"会议中心",factory_workshop:"车间",workroom:"工作间",industrial_warehouse:"工业仓库",construction_site:"施工现场",equipment_room:"设备间",testing_lab:"检测实验室",park_garden:"公园与花园",public_facility:"公共设施",street:"街道",farm:"农场",indoor_sports_venue:"室内运动馆",sports_area:"运动场地",transportation:"交通空间",other:"其他"},Qn=n=>n.split("_").map(r=>r&&r[0].toUpperCase()+r.slice(1)).join(" "),Wr=Un(jr),U=Wr.map(n=>{const r=n.name.replace(/_/g,"-"),i={L1:D(n.L1),L2:D(n.L2_estimated),L3:D(n.L3)},u=i.L1+i.L2+i.L3;return{key:r,name:{en:Qn(n.name),zh:Zr[n.name]??Qn(n.name)},zone:n.category||"other",image:`scenes/${n.name}.jpg`,hours:i,total:u,share:0,tiers:{L1:0,L2:0,L3:0},blurb:{en:"Recorded across the corpus; tier coverage follows the report’s table.",zh:"全库记录；层级覆盖依照报告表格。"}}}),Gr=U.reduce((n,r)=>n+r.total,0),qn=Math.round(Gr*1e3)/1e3;for(const n of U)n.share=n.total/qn*100,n.tiers={L1:n.total?n.hours.L1/n.total*100:0,L2:n.total?n.hours.L2/n.total*100:0,L3:n.total?n.hours.L3/n.total*100:0};const An=n=>Math.round(n*1e3)/1e3,pn=qr.map(n=>{const r=An(U.reduce((i,u)=>i+u.hours[n.id],0));return{...n,hours:r,share:r/qn*100}});function nr(n){return pn.find(r=>r.id===n)}function rr(n,r){return nr(n).hours*nr(n).setting[r]/100}tn.reduce((n,r)=>n+rr(r,"controlled"),0),tn.reduce((n,r)=>n+rr(r,"open"),0);const hr=Hr.map(n=>{const r=U.filter(u=>u.zone===n.id),i=r.reduce((u,L)=>u+L.total,0);return{...n,note:{en:`${r.length} classes, ${Math.round(i).toLocaleString("en-US")} h`,zh:`${r.length} 个类别，${Math.round(i).toLocaleString("en-US")} 小时`}}}),Pr=hr.map(n=>{const r=U.filter(L=>L.zone===n.id).sort((L,_)=>_.total-L.total),i={L1:r.reduce((L,_)=>L+_.hours.L1,0),L2:r.reduce((L,_)=>L+_.hours.L2,0),L3:r.reduce((L,_)=>L+_.hours.L3,0)},u=i.L1+i.L2+i.L3;return{zone:n,scenes:r,hours:u,share:u/qn*100,tiers:i,tierShare:{L1:u?i.L1/u*100:0,L2:u?i.L2/u*100:0,L3:u?i.L3/u*100:0}}});An(U.reduce((n,r)=>n+r.hours.L1,0)),An(U.reduce((n,r)=>n+r.hours.L2,0)),An(U.reduce((n,r)=>n+r.hours.L3,0));const pr=Un(Dr),bn=pr.filter(n=>n.layer==="subtask").map(n=>{const r={L1:D(n.L1),L2:D(n.L2_estimated),L3:D(n.L3)},i=r.L1+r.L2+r.L3,u=tn.reduce((L,_)=>r[_]>r[L]?_:L,"L1");return{verb:n.name,name:{en:n.name,zh:n.zh||n.name},total:i,tiers:r,origin:u}}),Vr=[...bn].sort((n,r)=>r.total-n.total),Y={entries:bn.reduce((n,r)=>n+r.total,0),top10:Vr.slice(0,10).reduce((n,r)=>n+r.total,0),types:bn.length};pr.filter(n=>n.layer!=="subtask").map(n=>({name:n.name,zh:n.zh,total:D(n.L1)+D(n.L2_estimated)+D(n.L3)}));const Xr=Un(Nr),W=Xr.map(n=>{const r={L1:D(n.L1),L2:D(n.L2_estimated),L3:D(n.L3)};return{rank:0,name:n.name,zh:n.zh||n.name,total:r.L1+r.L2+r.L3,tiers:r}}).sort((n,r)=>r.total-n.total).map((n,r)=>({...n,rank:r+1})),gn={entries:W.length,instances:W.reduce((n,r)=>n+r.total,0),top20:W.slice(0,20).reduce((n,r)=>n+r.total,0)},er=Un(Ur);function br(n){const r=[];for(const i of er)i.panel===n&&!r.includes(i.bin)&&r.push(i.bin);return r.map(i=>{const u=L=>D(er.find(_=>_.panel===n&&_.bin===i&&_.level===L)?.percentage);return{label:i,L1:u("L1"),L2:u("L2"),L3:u("L3")}})}const vn=br("duration");br("subtask");function Zn(n,r){let i=0;for(const u of n)if(i+=u[r],i>=50)return u.label;return n[n.length-1]?.label??""}const Wn={L1:Zn(vn,"L1"),L2:Zn(vn,"L2"),L3:Zn(vn,"L3")},or=U.map(n=>({key:n.key,file:n.image,scene:n})),Nn={L1:"#9dbdd9",L2:"#5b8cba",L3:"#1f5f96"},Fn={L1:"",L2:"5 3",L3:"1.4 2.8"},In={L1:"circle",L2:"square",L3:"diamond"};function jn(n,r,i){if(n==="circle")return`M${r-2.4},${i}a${2.4},${2.4} 0 1,0 ${2*2.4},0a${2.4},${2.4} 0 1,0 ${-2*2.4},0Z`;if(n==="square")return`M${r-2.1},${i-2.1}h${2*2.1}v${2*2.1}h${-2*2.1}Z`;const u=2.9;return`M${r},${i-u}L${r+u},${i}L${r},${i+u}L${r-u},${i}Z`}const Yr=["width","height","viewBox"],Jr=["x2","y1","y2","stroke","stroke-dasharray"],Kr=["d","fill"],Qr=cn({__name:"TierGlyph",props:{id:{},w:{default:26},h:{default:10}},setup(n){return(r,i)=>(c(),a("svg",{class:"glyph",width:n.w,height:n.h,viewBox:`0 0 ${n.w} ${n.h}`,"aria-hidden":"true",focusable:"false"},[e("line",{x1:1,x2:n.w-1,y1:n.h/2,y2:n.h/2,stroke:o(Nn)[n.id],"stroke-width":"1.3","stroke-dasharray":o(Fn)[n.id]||void 0},null,8,Jr),e("path",{d:o(jn)(o(In)[n.id],n.w/2,n.h/2),fill:o(Nn)[n.id]},null,8,Kr)],8,Yr))}}),Vn=an(Qr,[["__scopeId","data-v-25bebfe6"]]),ne={key:0,class:"top__bar"},re={class:"top__k mono"},ee={class:"top__a mono"},oe=["data-on","width","viewBox","aria-label"],te=["x2","y1","y2"],ce=["x","y","width","height","fill"],ae=["x","y","transform"],se=["x","y","transform"],Gn=264,ie=54,Bn=120,Cn=6,ue=cn({__name:"TopBars",props:{kicker:{},total:{},rows:{},n:{default:20},bare:{type:Boolean,default:!1}},setup(n){const r=n,{t:i,isZh:u}=$n(),L=k=>Math.round(k).toLocaleString("en-US"),{el:_,shown:f}=dr({margin:"0px 0px -10% 0px",threshold:.25}),d=typeof window<"u"&&window.matchMedia("(prefers-reduced-motion: reduce)").matches,v=B(()=>d||f.value),$=ie+Bn,g=B(()=>r.rows.slice(0,r.n)),q=B(()=>u.value?`${r.total} 中的前 ${g.value.length}`:`Top ${g.value.length} of ${r.total}`),G=k=>(k-Cn*2)/Math.max(g.value.length,1),y=k=>Math.max(4,G(k)-3),w=(k,O)=>Cn+O*G(k)+G(k)/2,C=(k,O)=>w(k,O)-y(k)/2,P=B(()=>{const k=Math.max(1,...g.value.map(O=>O.total));return g.value.map(O=>{let M=0;const T=["L1","L2","L3"].map(R=>{const N=O.tiers[R],nn=$-(M+N)/k*Bn,sn=N/k*Bn;return M+=N,{id:R,y:nn,h:sn,fill:Nn[R]}}).filter(R=>R.h>.2);return{row:O,top:$-O.total/k*Bn,segs:T}})});return(k,O)=>(c(),a("section",{ref_key:"rootEl",ref:_,class:Dn(["top",{"top--bare":n.bare}])},[n.bare?Xn("",!0):(c(),a("header",ne,[e("p",re,t(o(i)(n.kicker)),1),e("p",ee,t(q.value),1)])),E(hn,{h:Gn},{default:on(({w:M})=>[(c(),a("svg",{class:"plot","data-on":v.value?"true":"false",width:M,height:Gn,viewBox:`0 0 ${M} ${Gn}`,role:"img","aria-label":`${q.value}, ranked by count`},[e("line",{class:"base",x1:Cn,x2:M-Cn,y1:$+.5,y2:$+.5},null,8,te),(c(!0),a(x,null,z(P.value,(T,R)=>(c(),a("g",{key:T.row.label},[e("title",null,t(T.row.label)+" · "+t(L(T.row.total)),1),e("g",{class:"grow",style:V({"--i":R})},[(c(!0),a(x,null,z(T.segs,N=>(c(),a("rect",{key:N.id,x:C(M,R),y:N.y,width:y(M),height:Math.max(.4,N.h-1),fill:N.fill},null,8,ce))),128))],4),e("text",{class:"t-val",x:w(M,R)+3.6,y:T.top-5,transform:`rotate(-90 ${w(M,R)+3.6} ${T.top-5})`,"text-anchor":"start"},t(L(T.row.total)),9,ae),e("text",{class:"t-lab",x:w(M,R)+3.6,y:$+8,transform:`rotate(-90 ${w(M,R)+3.6} ${$+8})`,"text-anchor":"end"},t(T.row.label),9,se)]))),128))],8,oe))]),_:1})],2))}}),tr=an(ue,[["__scopeId","data-v-e8958630"]]),le=["data-on"],de={class:"plate"},he={class:"cell cell--a"},pe={class:"cell__head"},be={class:"cell__top"},_e={class:"cell__t"},me={class:"cell__okey"},ke={class:"cell__s"},Le=["width","viewBox","aria-label"],fe=["x1","x2","y1","y2"],ge=["d","fill"],ye=["y"],xe=["y","width","fill"],ve=["x","y","width","fill"],$e=["x","y","width"],we=["x","y"],ze=["x2","y1","y2"],Me=["y"],Se=["x","y"],Ee={class:"cell cell--b"},Oe={class:"cell__head"},Te={class:"cell__t"},Re={class:"cell__s"},Be=["width","viewBox","aria-label"],Ce=["d","fill"],Ae=["y"],Fe=["d"],Ie=["d"],je=["x2","y1","y2"],De=["y"],Ne=["x","y"],Ue=["x","y"],qe={class:"cell cell--c"},He={class:"cell__head"},Ze={class:"cell__t"},We={class:"cell__s"},Ge=["width","viewBox","aria-label"],Pe=["d","fill"],Ve=["y"],Xe=["x","y","width"],Ye=["x","y"],Je={class:"cell cell--d"},Ke={class:"cell__head"},Qe={class:"cell__t"},no={class:"cell__s"},ro=["width","viewBox","aria-label"],eo=["x","y","width","height","fill"],oo=["x","y","transform"],to=["x","transform"],co=["x"],ao=["x1","x2"],so=["x2","y1","y2"],io={id:"data-tasks",class:"cell cell--e"},uo={class:"cell__head"},lo={class:"cell__top"},ho={class:"cell__t"},po={class:"cell__q mono"},bo={class:"cell__s"},_o={class:"cell__legend"},mo={class:"cell__foot"},ko={id:"data-objects",class:"cell cell--f"},Lo={class:"cell__head"},fo={class:"cell__top"},go={class:"cell__t"},yo={class:"cell__q mono"},xo={class:"cell__s"},vo={class:"cell__legend"},$o={class:"cell__foot"},wo={class:"stats__note"},H=22,A=24,I=118,Pn=320,cr=150,zo=5,Mo=11,ar=18.5,So=74,yn=190,sr=194,dn=20,Eo=cn({__name:"FigureStats",setup(n){const{t:r,isZh:i}=$n(),{el:u,shown:L}=dr({margin:"0px 0px -10% 0px",threshold:.25}),_=typeof window<"u"&&window.matchMedia("(prefers-reduced-motion: reduce)").matches,f=B(()=>_||L.value),d=s=>Math.round(s).toLocaleString("en-US"),v=s=>s.toLocaleString("en-US",{minimumFractionDigits:1,maximumFractionDigits:1}),$=Nn,g=[10,44,78],q=Math.max(...pn.map(s=>s.hours)),G=pn.map(s=>{const b=s.hours*s.setting.controlled/100;return{id:s.id,hours:s.hours,open:s.hours-b,ctrl:b}}),y=(s,b)=>A+b/q*Math.max(40,s-A-62),w=tn.map(s=>({id:s,shares:vn.map(b=>b[s])})),C=Math.max(...w.flatMap(s=>s.shares)),P=s=>Math.max(2,(s-A-4)/Math.max(1,vn.length));function k(s,b,h){const p=P(s),l=g[b],Q=h.map((On,Tn)=>{const rn=A+(Tn+.5)*p,en=l+H-On/C*H;return`${rn.toFixed(1)},${en.toFixed(1)}`}),F=(l+H).toFixed(1),En=(A+.5*p).toFixed(1),kn=(A+(h.length-.5)*p).toFixed(1);return{line:`M${Q.join(" L")}`,area:`M${En},${F} L${Q.join(" L")} L${kn},${F} Z`}}const O=B(()=>Pr.map(s=>({id:s.zone.id,name:r(s.zone.name),scenes:s.scenes.map(b=>({key:b.key,name:r(b.name),total:b.total,hours:b.hours}))}))),M=B(()=>O.value.flatMap(s=>s.scenes)),T=B(()=>M.value.length),R=B(()=>tn.map(s=>{const b=M.value.map(h=>h.hours[s]>0);return{id:s,cells:b,reached:b.filter(Boolean).length}})),N=s=>Math.max(1.2,(s-A-52)/Math.max(T.value,1)),nn=Math.max(...M.value.map(s=>s.total));function sn(s){const h=s-1,p=12,l=O.value,Q=Math.max(1,l.reduce((en,Rn)=>en+Rn.scenes.length,0)),F=(h-1-p*(l.length-1))/Q,En=Math.max(1.5,F-6),kn=yn-So,On=[],Tn=[];let rn=1;return l.forEach(en=>{const Rn=rn;for(const Ln of en.scenes){let Jn=0;const kr=tn.map(fn=>{const Hn=Ln.hours[fn],Lr=yn-(Jn+Hn)/nn*kn,fr=Hn/nn*kn;return Jn+=Hn,{id:fn,y:Lr,h:fr,fill:$[fn]}}).filter(fn=>fn.h>.15);On.push({key:Ln.key,name:Ln.name,total:Ln.total,top:yn-Ln.total/nn*kn,x:rn,w:En,segs:kr}),rn+=F}const Yn=rn-F+En;Tn.push({id:en.id,name:en.name,cx:Math.min(s-40,Math.max(40,(Rn+Yn)/2)),x0:Rn,x1:Yn}),rn+=p}),{bars:On,zones:Tn}}function wn(s){return tn.map(b=>({id:b,colour:$[b],dash:Fn[b],values:s.map(h=>h.tiers[b]).filter(h=>h>0).sort((h,p)=>p-h)}))}const _n=B(()=>wn(bn)),zn=B(()=>wn(W)),X=B(()=>[...bn].sort((s,b)=>b.total-s.total).map(s=>({label:r(s.name),total:s.total,tiers:s.tiers}))),m=B(()=>[...W].sort((s,b)=>b.total-s.total).map(s=>({label:i.value?s.zh:s.name,total:s.total,tiers:s.tiers}))),S=Math.round(Y.top10/Y.entries*100),j=Math.round(gn.top20/gn.instances*100),mn=[...bn].sort((s,b)=>b.total-s.total).at(-1)?.total??0,J=W[W.length-1]?.total??0,K=s=>Number.isInteger(s)?String(s):s>=10?String(Math.round(s)):s.toFixed(1),Mn=s=>Math.pow(10,Math.ceil(Math.log10(Math.max(2,...s.flatMap(b=>b.values))))),Sn=B(()=>Mn(_n.value)),_r=B(()=>Mn(zn.value)),un={a:{en:"Hours per tier, split into open and controlled collection.",zh:"各层级时长，分为开放与受控采集。"},b:{en:"Episode length per tier over ten-second bins to 300 s.",zh:"各层级片段长度，10 秒一档，到 300 秒。"},c:{en:"Of the thirty-eight scene classes, how many each tier records. Derived from panel d.",zh:"38 个场景类别中，每一层实际记录了多少个；由面板 d 数得。"},d:{en:"Thirty-eight scene classes in zone order, each bar stacked by the tier that records it.",zh:"38 个场景类别按区域排列，条形按记录它的层级堆叠。"},e:{en:"Rank within each tier against that tier’s count for the verb, on log axes.",zh:"各层内部排序与该层动词计数的关系，双对数轴。"},f:{en:"Rank within each tier against that tier’s instance count for the object entry, on log axes.",zh:"各层内部排序与该层物体实例数的关系，双对数轴。"}},mr={en:"Every count is read from the report’s Fig. 2 tables — scenes, actions, objects, episode profiles — not modelled; the L2 columns are the report’s estimate. (c) is counted from (d).",zh:"所有计数取自报告 Fig. 2 的四张表——场景、动作、物体、片段分布——未经拟合；其中 L2 一列为报告的估计值。(c) 由 (d) 数得。"};return(s,b)=>(c(),a("div",{ref_key:"rootEl",ref:u,class:"stats","data-on":f.value?"true":"false"},[e("div",de,[e("figure",he,[e("figcaption",pe,[e("div",be,[e("p",_e,[b[0]||(b[0]=e("span",{class:"cell__n"},"(a)",-1)),Z(" "+t(o(r)({en:"Recorded hours",zh:"录制时长"})),1)]),e("ul",me,[e("li",null,[b[1]||(b[1]=e("i",{class:"sw sw--flat"},null,-1)),Z(t(o(r)({en:"open",zh:"开放"})),1)]),e("li",null,[b[2]||(b[2]=e("i",{class:"sw sw--hatch"},null,-1)),Z(t(o(r)({en:"controlled",zh:"受控"})),1)])])]),e("p",ke,t(o(r)({en:"10,000 · 2,000 · 500 h",zh:"10,000 · 2,000 · 500 小时"})),1)]),E(hn,{h:I},{default:on(({w:h})=>[(c(),a("svg",{class:"plot",width:h,height:I,viewBox:`0 0 ${h} ${I}`,role:"img","aria-label":o(r)(un.a)},[b[3]||(b[3]=e("defs",null,[e("pattern",{id:"hc-hatch",width:"4",height:"4",patternUnits:"userSpaceOnUse",patternTransform:"rotate(45)"},[e("line",{x1:"0",y1:"0",x2:"0",y2:"4",stroke:"#fff","stroke-width":"1","stroke-opacity":"0.9"})])],-1)),(c(),a(x,null,z([25,50,75],p=>e("line",{key:p,class:"grid",x1:y(h,p/100*o(q)),x2:y(h,p/100*o(q)),y1:g[0]-3,y2:g[2]+H+3},null,8,fe)),64)),(c(!0),a(x,null,z(o(G),(p,l)=>(c(),a("g",{key:p.id},[e("path",{d:o(jn)(o(In)[p.id],4,g[l]+11),fill:o($)[p.id]},null,8,ge),e("text",{class:"t-id",x:"10.5",y:g[l]+15},t(p.id),9,ye),e("g",{class:"grow",style:V({"--i":l})},[e("rect",{x:A,y:g[l],width:Math.max(1.5,y(h,p.open)-A-(p.ctrl>0?1:0)),height:H,fill:o($)[p.id]},null,8,xe),p.ctrl>0?(c(),a(x,{key:0},[e("rect",{x:y(h,p.open),y:g[l],width:Math.max(1.5,y(h,p.hours)-y(h,p.open)),height:H,fill:o($)[p.id]},null,8,ve),e("rect",{x:y(h,p.open),y:g[l],width:Math.max(1.5,y(h,p.hours)-y(h,p.open)),height:H,fill:"url(#hc-hatch)"},null,8,$e)],64)):Xn("",!0)],4),e("text",{class:"t-val",x:h,y:g[l]+15,"text-anchor":"end"},t(d(p.hours))+" h ",9,we)]))),128)),e("line",{class:"base",x1:A,x2:h-62,y1:g[2]+H+4,y2:g[2]+H+4},null,8,ze),e("text",{class:"t-tick",x:A,y:I-2},"0",8,Me),e("text",{class:"t-tick",x:h-62,y:I-2,"text-anchor":"end"},"10,000 h",8,Se)],8,Le))]),_:1})]),e("figure",Ee,[e("figcaption",Oe,[e("p",Te,[b[4]||(b[4]=e("span",{class:"cell__n"},"(b)",-1)),Z(" "+t(o(r)({en:"Episode length",zh:"片段长度"})),1)]),e("p",Re,t(o(r)({en:"median bin",zh:"中位数区间"}))+" "+t(o(Wn).L1)+" / "+t(o(Wn).L2)+" / "+t(o(Wn).L3),1)]),E(hn,{h:I},{default:on(({w:h})=>[(c(),a("svg",{class:"plot",width:h,height:I,viewBox:`0 0 ${h} ${I}`,role:"img","aria-label":o(r)(un.b)},[(c(!0),a(x,null,z(o(w),(p,l)=>(c(),a("g",{key:p.id},[e("path",{d:o(jn)(o(In)[p.id],4,g[l]+11),fill:o($)[p.id]},null,8,Ce),e("text",{class:"t-id",x:"10.5",y:g[l]+15},t(p.id),9,Ae),e("path",{class:"spark",d:k(h,l,p.shares).area,style:V({fill:o($)[p.id],"--i":l})},null,12,Fe),e("path",{class:Dn(["spark-line",{"is-dash":!!o(Fn)[p.id]}]),pathLength:1,d:k(h,l,p.shares).line,style:V({stroke:o($)[p.id],strokeDasharray:o(Fn)[p.id]||void 0,"--i":l})},null,14,Ie),e("line",{class:"base",x1:A,x2:h-4,y1:g[l]+H+.5,y2:g[l]+H+.5},null,8,je)]))),128)),e("text",{class:"t-tick",x:A,y:I-2},"0",8,De),e("text",{class:"t-tick",x:(A+h)/2,y:I-2,"text-anchor":"middle"},"150",8,Ne),e("text",{class:"t-tick",x:h-4,y:I-2,"text-anchor":"end"},"300+ s",8,Ue)],8,Be))]),_:1})]),e("figure",qe,[e("figcaption",He,[e("p",Ze,[b[5]||(b[5]=e("span",{class:"cell__n"},"(c)",-1)),Z(" "+t(o(r)({en:"Classes reached",zh:"覆盖类别"})),1)]),e("p",We,t(o(r)({en:"derived from (d) ·",zh:"由 (d) 数得 ·"}))+" "+t(T.value)+" "+t(o(r)({en:"classes",zh:"类"})),1)]),E(hn,{h:I},{default:on(({w:h})=>[(c(),a("svg",{class:"plot",width:h,height:I,viewBox:`0 0 ${h} ${I}`,role:"img","aria-label":o(r)(un.c)},[(c(!0),a(x,null,z(R.value,(p,l)=>(c(),a("g",{key:p.id},[e("path",{d:o(jn)(o(In)[p.id],4,g[l]+11),fill:o($)[p.id]},null,8,Pe),e("text",{class:"t-id",x:"10.5",y:g[l]+15},t(p.id),9,Ve),e("g",{class:"grow",style:V({"--i":l})},[(c(!0),a(x,null,z(p.cells,(Q,F)=>(c(),a("rect",{key:F,class:Dn(["cellmark",{"is-off":!Q}]),x:A+zo+F*N(h),y:g[l]+7,width:Math.max(1,N(h)-1.6),height:8,style:V({"--c":o($)[p.id]})},null,14,Xe))),128))],4),e("text",{class:"t-val",x:h,y:g[l]+15,"text-anchor":"end"},t(p.reached)+"/"+t(p.cells.length),9,Ye)]))),128))],8,Ge))]),_:1})]),e("figure",Je,[e("figcaption",Ke,[e("p",Qe,[b[6]||(b[6]=e("span",{class:"cell__n"},"(d)",-1)),Z(" "+t(o(r)({en:"Scene vocabulary",zh:"场景词表"})),1)]),e("p",no,t(T.value)+" "+t(o(r)({en:"classes · five zones + residual",zh:"个类别 · 五个区域加残余类"})),1)]),E(hn,{h:Pn},{default:on(({w:h})=>[(c(),a("svg",{class:"plot",width:h,height:Pn,viewBox:`0 0 ${h} ${Pn}`,role:"img","aria-label":o(r)(un.d)},[(c(!0),a(x,null,z([sn(h)],p=>(c(),a(x,{key:0},[(c(!0),a(x,null,z(p.bars,(l,Q)=>(c(),a("g",{key:l.key},[e("title",null,t(l.name)+" · "+t(d(l.total))+" h",1),e("g",{class:"grow",style:V({"--i":Q})},[(c(!0),a(x,null,z(l.segs,F=>(c(),a("rect",{key:F.id,x:l.x,y:F.y,width:l.w,height:Math.max(.4,F.h-1),fill:F.fill},null,8,eo))),128))],4),e("text",{class:"t-dv",x:l.x+l.w/2+3.6,y:l.top-4,transform:`rotate(-90 ${l.x+l.w/2+3.6} ${l.top-4})`,"text-anchor":"start"},t(v(l.total)),9,oo),e("text",{class:"t-lab",x:l.x+l.w/2,y:sr,transform:`rotate(-90 ${l.x+l.w/2} ${sr})`,"text-anchor":"end"},t(l.name),9,to)]))),128)),(c(!0),a(x,null,z(p.zones,l=>(c(),a("text",{key:`z${l.id}`,class:"t-zone",x:l.cx,y:Mo,"text-anchor":"middle"},t(l.name),9,co))),128)),(c(!0),a(x,null,z(p.zones,l=>(c(),a("line",{key:`r${l.id}`,class:"group-rule",x1:l.x0,x2:l.x1+2,y1:ar,y2:ar},null,8,ao))),128))],64))),128)),e("line",{class:"base",x1:"1",x2:h-1,y1:yn+.5,y2:yn+.5},null,8,so)],8,ro))]),_:1})]),e("figure",io,[e("figcaption",uo,[e("div",lo,[e("p",ho,[b[7]||(b[7]=e("span",{class:"cell__n"},"(e)",-1)),Z(" "+t(o(r)({en:"Action vocabulary",zh:"动作词表"})),1)]),e("p",po,t(o(r)({en:`Top ${dn} of ${o(Y).types}`,zh:`${o(Y).types} 中的前 ${dn}`})),1)]),e("p",bo,t(o(Y).types)+" "+t(o(r)({en:"types ·",zh:"种 ·"}))+" "+t(d(o(Y).entries))+" "+t(o(r)({en:"occurrences",zh:"次"})),1)]),e("ul",_o,[(c(!0),a(x,null,z(o(pn),h=>(c(),a("li",{key:h.id},[E(Vn,{id:h.id,w:24,h:9},null,8,["id"]),Z(t(h.id),1)]))),128))]),E(Kn,{series:_n.value,"y-max":Sn.value,h:cr,aria:un.e,on:f.value},null,8,["series","y-max","aria","on"]),E(tr,{class:"cell__top20",kicker:{en:"Actions · verbs",zh:"动作 · 动词"},total:o(Y).types,rows:X.value,n:dn,bare:""},null,8,["total","rows"]),e("p",mo,t(o(r)({en:"top 10 =",zh:"前 10 个 ="}))+" "+t(o(S))+"% "+t(o(r)({en:`of occurrences · rank ${o(Y).types} = ${K(o(mn))}`,zh:`的次数 · 第 ${o(Y).types} 位 = ${K(o(mn))}`})),1)]),e("figure",ko,[e("figcaption",Lo,[e("div",fo,[e("p",go,[b[8]||(b[8]=e("span",{class:"cell__n"},"(f)",-1)),Z(" "+t(o(r)({en:"Object vocabulary",zh:"物体词表"})),1)]),e("p",yo,t(o(r)({en:`Top ${dn} of ${o(W).length}`,zh:`${o(W).length} 条中的前 ${dn}`})),1)]),e("p",xo,t(o(W).length)+" "+t(o(r)({en:"entries ·",zh:"条 ·"}))+" "+t(d(o(gn).instances))+" "+t(o(r)({en:"annotation occurrences",zh:"次标注"})),1)]),e("ul",vo,[(c(!0),a(x,null,z(o(pn),h=>(c(),a("li",{key:h.id},[E(Vn,{id:h.id,w:24,h:9},null,8,["id"]),Z(t(h.id),1)]))),128))]),E(Kn,{series:zn.value,"y-max":_r.value,h:cr,aria:un.f,on:f.value},null,8,["series","y-max","aria","on"]),E(tr,{class:"cell__top20",kicker:{en:"Objects · entries",zh:"物体 · 条目"},total:o(W).length,rows:m.value,n:dn,bare:""},null,8,["total","rows"]),e("p",$o,t(o(r)({en:"top 20 =",zh:"前 20 条 ="}))+" "+t(o(j))+"% "+t(o(r)({en:`of annotations · rank ${o(gn).entries} = ${K(o(J))}`,zh:`的标注 · 第 ${o(gn).entries} 条 = ${K(o(J))}`})),1)])]),e("p",wo,t(o(r)(mr)),1)],8,le))}}),Oo=an(Eo,[["__scopeId","data-v-5b89640b"]]),To=["aria-label"],Ro={class:"strip__k mono"},Bo=["aria-label"],Co=["src","alt","onError"],Ao={key:1,class:"tile__fallback"},Fo={class:"tile__cap"},Io={class:"tile__name"},jo={class:"tile__meta"},Do=88,ir=1,No=cn({__name:"SceneStrip",setup(n){const{t:r,isZh:i}=$n(),u=y=>{const w=hr.find(C=>C.id===y);return w?r(w.name):y},L=i.value?"场景 · FIG. 8 — 38 类全部":`Scenes · Fig. 8 — ${U.length} of ${U.length} classes`,_=i.value?"报告 fig. 8 的 38 幅真实场景画面，按区域顺序排列；悬停或聚焦某幅可读取类别、区域、小时与占比。":"38 real scene frames from the report’s figure 8, in zone order; hover or focus a tile for its class, zone, hours and share.",f=xn(11),d=xn(null);let v=null;function $(y){const w=y.getBoundingClientRect().width;if(w<=0)return;const C=Math.max(2,Math.floor((w+ir)/(Do+ir)));C!==f.value&&(f.value=C)}ur(()=>{const y=d.value;y&&($(y),!(typeof ResizeObserver>"u")&&(v=new ResizeObserver(()=>$(y)),v.observe(y)))}),lr(()=>{v?.disconnect(),v=null});const g=B(()=>{const y=or.length,w=Math.max(1,Math.ceil(y/f.value)),C=Math.ceil(y/w),P=[];for(let k=0;k<y;k+=C)P.push(or.slice(k,k+C));return P}),q=xn(new Set);function G(y){const w=new Set(q.value);w.add(y),q.value=w}return(y,w)=>(c(),a("section",{class:"strip",role:"group","aria-label":o(_)},[e("p",Ro,t(o(L)),1),e("div",{ref_key:"gridEl",ref:d,class:"strip__grid"},[(c(!0),a(x,null,z(g.value,(C,P)=>(c(),a("div",{key:P,class:"strip__row"},[(c(!0),a(x,null,z(C,k=>(c(),a("figure",{key:k.key,class:"tile",tabindex:"0","aria-label":`${o(r)(k.scene.name)} · ${u(k.scene.zone)} · ${Math.round(k.scene.total).toLocaleString("en-US")} h · ${k.scene.share.toFixed(1)}%`},[q.value.has(k.key)?(c(),a("span",Ao,t(o(r)(k.scene.name)),1)):(c(),a("img",{key:0,src:k.file,alt:o(r)(k.scene.name),width:"900",height:"676",draggable:"false",loading:"lazy",decoding:"async",onError:O=>G(k.key)},null,40,Co)),e("figcaption",Fo,[e("span",Io,t(o(r)(k.scene.name)),1),e("span",jo,t(u(k.scene.zone))+" · "+t(Math.round(k.scene.total).toLocaleString("en-US"))+" h · "+t(k.scene.share.toFixed(1))+"% ",1)])],8,Bo))),128))]))),128))],512)],8,To))}}),Uo=an(No,[["__scopeId","data-v-7950d752"]]),qo={id:"data",class:"section section--tinted"},Ho={class:"shell"},Zo={class:"data-lead"},Wo={class:"dstats"},Go={class:"dstats__v"},Po={class:"dstats__l"},Vo={class:"dstats__v"},Xo={class:"dstats__l"},Yo={class:"dstats__l"},Jo={class:"dstats__l"},Ko={class:"dfig"},Qo={class:"dfig__key"},nt={class:"dfig__id mono"},rt={class:"dfig__v mono"},et={class:"dfig__band-strip"},ot=cn({__name:"DataSection",setup(n){const{t:r,list:i}=$n(),u=L=>L.toLocaleString("en-US");return(L,_)=>{const f=xr("reveal");return c(),a("section",qo,[e("div",Ho,[E(wr,{num:o(ln).num,kicker:o(ln).kicker,title:o(ln).title,"aside-wide":""},{aside:on(()=>[e("div",Zo,[(c(!0),a(x,null,z(o(i)(o(ln).body),(d,v)=>(c(),a("p",{key:v},[E($r,{text:d},null,8,["text"])]))),128))])]),_:1},8,["num","kicker","title"]),e("ul",Wo,[e("li",null,[e("p",Go,[Z(t(u(o(qn))),1),_[0]||(_[0]=e("span",null,"h",-1))]),e("p",Po,t(o(r)({en:"Recording volume",zh:"采集规模"})),1)]),e("li",null,[e("p",Vo,t(o(U).length),1),e("p",Xo,t(o(r)({en:"Scene classes",zh:"场景类别"})),1)]),e("li",null,[_[1]||(_[1]=e("p",{class:"dstats__v"},"99",-1)),e("p",Yo,t(o(r)({en:"Task verbs",zh:"任务动词"})),1)]),e("li",null,[_[2]||(_[2]=e("p",{class:"dstats__v"},"635",-1)),e("p",Jo,t(o(r)({en:"Object classes",zh:"物体类别"})),1)])]),vr((c(),a("figure",Ko,[E(zr,{n:"03",title:o(ln).statsTitle,aside:o(ln).statsAside},null,8,["title","aside"]),e("ul",Qo,[(c(!0),a(x,null,z(o(pn),d=>(c(),a("li",{key:d.id},[E(Vn,{id:d.id,w:24,h:9},null,8,["id"]),e("span",nt,t(d.id),1),e("span",null,t(o(r)(d.name)),1),e("span",rt,t(u(d.hours))+" h",1)]))),128))]),E(Oo,{id:"data-stats"})])),[[f]]),e("div",et,[E(Uo,{id:"data-scenes"})])])])}}}),ct=an(ot,[["__scopeId","data-v-19195ca9"]]);export{ct as default};
