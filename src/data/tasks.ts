/**
 * Task-protocol composition, task by task.
 *
 * Every entry below is one row of the release plan's task tables: §7.1
 * single-person high-cognitive, §7.2a dual high-cognitive, §7.2b dual ordinary,
 * §7.3 general instrumented tasks, §7.4 portable external-capture segments.
 * The task names, props and cognitive-load points are the plan's own wording;
 * `detail` carries the plan's load point for the high-cognitive tables and its
 * task description for the general table.
 *
 * Nothing here is a count of collected episodes. A row is a protocol entry: a
 * class of task assigned to a station, and the station carries the tier the
 * plan assigns that class to. Because the counts are derived from this list
 * rather than written beside it, a bar and its rows cannot disagree.
 *
 * The plan constrains high-cognitive tasks to seated or standing upper-limb
 * work at a fixed workstation — desk, workbench or dual-interaction table —
 * and L3 further requires a fixed desk because the EEG amplifier cable tethers
 * the wearer to the host, which is what makes every L3 station a desktop one.
 * Anything that has to move to a cooktop, a laundry area or a bedroom is L2's.
 * L1 runs the same ontology as a passive natural stream rather than an
 * enumerated protocol, so it contributes no entries and is shown as such.
 */

import type { Bi } from '@/content'

/** One protocol row: a named task and the line the plan gives about it. */
export interface TaskItem {
  name: Bi
  /** The plan's cognitive-load point, or its one-line task description. */
  detail: Bi
}

/**
 * One scene, its name, and the nearest of the six generated concept
 * illustrations available for it. The illustrations are a fixed set, so when a
 * station has no picture of its own the closest scene is used and the figure
 * says so rather than implying the crop depicts that task.
 */
interface Scene {
  name: Bi
  image: string
}

const img = (n: string) => `generated/${n}.jpg`
const SCENE: Record<string, Scene> = {
  desk: { name: { en: 'Desk', zh: '书桌' }, image: img('desk') },
  bench: { name: { en: 'Workbench', zh: '工作台' }, image: img('workbench') },
  dual: { name: { en: 'Dual-interaction table', zh: '双人交互桌' }, image: img('workbench') },
  cooktop: { name: { en: 'Cooktop', zh: '灶台' }, image: img('kitchen') },
  prep: { name: { en: 'Prep counter', zh: '备菜台' }, image: img('kitchen') },
  dining: { name: { en: 'Dining table', zh: '餐桌' }, image: img('kitchen') },
  laundry: { name: { en: 'Laundry area', zh: '洗衣区' }, image: img('laundry') },
  bed: { name: { en: 'Bed', zh: '床铺' }, image: img('laundry') },
  bedroom: { name: { en: 'Bedroom', zh: '卧室' }, image: img('laundry') },
  wardrobe: { name: { en: 'Wardrobe', zh: '衣柜' }, image: img('laundry') },
  shelving: { name: { en: 'Shelving', zh: '货架' }, image: img('market') },
  bath: { name: { en: 'Bathroom', zh: '卫浴' }, image: img('laundry') },
  market: { name: { en: 'Supermarket', zh: '商超' }, image: img('market') },
  homeKitchen: { name: { en: 'Home kitchen', zh: '家庭厨房' }, image: img('kitchen') },
  pharmacy: { name: { en: 'Pharmacy', zh: '药房' }, image: img('market') },
  salon: { name: { en: 'Hair salon', zh: '美发店' }, image: img('market') },
  cafe: { name: { en: 'Café', zh: '咖啡馆' }, image: img('coffee') },
}

export interface TaskRow {
  key: string
  /** Scenario station plus the class of task that runs there. */
  label: Bi
  /** Physical scene the station belongs to, as the plan names it. */
  scene: Bi
  /** Concept illustration used for this station's task thumbnails. */
  image: string
  tier: 'L2' | 'L3'
  /** Which task table the entry comes from, e.g. `7.1`. */
  source: string
  /** True for the portable external-capture stations (§7.4). */
  external: boolean
  tasks: TaskItem[]
}

export const TASK_ROWS: TaskRow[] = [
  /* ---- §7.1 high-cognitive, single person, fixed workstation (L3) ---- */
  {
    key: 'desk-hc',
    label: { en: 'Desk · high-cognitive', zh: '书桌 · 高思维' },
    scene: SCENE.desk.name,
    image: SCENE.desk.image,
    tier: 'L3',
    source: '7.1',
    external: false,
    tasks: [
      { name: { en: "Rubik's cube (scramble → solve)", zh: '魔方复原（打乱→还原）' }, detail: { en: 'Spatial reasoning · strategy memory', zh: '空间推理、策略记忆' } },
      { name: { en: 'Tower of Hanoi, 7 discs', zh: '汉诺塔（7 层）' }, detail: { en: 'Recursive planning · working memory', zh: '递归规划、工作记忆' } },
      { name: { en: 'Jigsaw, 100 / 300 pieces', zh: '拼图（100/300 片）' }, detail: { en: 'Visual search · whole–part switching', zh: '视觉搜索、整体-局部切换' } },
      { name: { en: 'Build blocks from a diagram', zh: '按图积木搭建' }, detail: { en: 'Diagram reading · stepwise execution · error correction', zh: '图纸理解、分步执行、纠错' } },
      { name: { en: 'Physical Sudoku', zh: '实物数独' }, detail: { en: 'Rule inference · hypothesis testing', zh: '规则推理、假设检验' } },
      { name: { en: 'Memory card matching', zh: '记忆翻牌配对' }, detail: { en: 'Spatial working memory', zh: '空间工作记忆' } },
      { name: { en: 'Follow a spoken instruction sequence', zh: '听指令序列执行' }, detail: { en: 'Auditory working memory', zh: '听觉工作记忆' } },
      { name: { en: 'Assemble a light meal from a recipe card', zh: '按食谱组装简餐（桌面化）' }, detail: { en: 'Step memory · parallel planning', zh: '步骤记忆、并行规划' } },
      { name: { en: "Fill a week's pill organiser", zh: '一周药盒分装' }, detail: { en: 'Rule following · repeated checking', zh: '规则遵循、反复核对' } },
      { name: { en: 'Sew on a button', zh: '缝纫钉扣' }, detail: { en: 'Fine sequence · sustained patience', zh: '精细序列、耐心维持' } },
      { name: { en: 'Wrap a gift', zh: '礼物包装' }, detail: { en: 'Size estimation · folding planning', zh: '尺寸估算、折叠规划' } },
    ],
  },
  {
    key: 'bench-hc',
    label: { en: 'Workbench · high-cognitive', zh: '工作台 · 高思维' },
    scene: SCENE.bench.name,
    image: SCENE.bench.image,
    tier: 'L3',
    source: '7.1',
    external: false,
    tasks: [
      { name: { en: 'Assemble a desktop PC', zh: '电脑主机装配' }, detail: { en: 'Diagram reading · spatial layout planning', zh: '图纸理解、空间排布规划' } },
      { name: { en: 'Assemble flat-pack furniture', zh: '拼装板材家具' }, detail: { en: 'Drawing-to-object mapping · sequence planning', zh: '图纸-实物映射、顺序规划' } },
      { name: { en: 'Simulated wall mounting, no drilling', zh: '壁挂安装模拟（无钻孔）' }, detail: { en: 'Spatial measurement · error control', zh: '空间测量、误差控制' } },
      { name: { en: 'Replace a filter cartridge', zh: '滤芯/滤网更换' }, detail: { en: 'Model lookup · ordered operation', zh: '型号检索、顺序操作' } },
      { name: { en: 'Set up smart-home pairing and scenes', zh: '智能家居配网与场景设置' }, detail: { en: 'Manual comprehension · multi-step configuration', zh: '说明书理解、多步配置' } },
    ],
  },
  {
    key: 'dual-hc',
    label: { en: 'Dual table · high-cognitive', zh: '双人桌 · 高思维' },
    scene: SCENE.dual.name,
    image: SCENE.dual.image,
    tier: 'L3',
    source: '7.2a',
    external: false,
    tasks: [
      { name: { en: 'Instruct-and-mimic assembly', zh: '指导-模仿装配' }, detail: { en: 'Theory of mind · instruction construction · spatial language', zh: '心理理论、指令构造、空间语言' } },
      { name: { en: 'Error spotting at the pill organiser', zh: '错误纠察（药盒分装）' }, detail: { en: 'Monitoring · rule recall · real-time feedback', zh: '观察监督、规则回忆、实时反馈' } },
      { name: { en: 'Teaching walkthrough: sandwich SOP', zh: '教学讲解（三明治标准流程）' }, detail: { en: 'Decomposing a demonstration · causal explanation', zh: '示范分解、因果解释' } },
      { name: { en: 'Teaching walkthrough: PC build and cabling', zh: '教学讲解（主机装配与走线）' }, detail: { en: 'Rule transfer · causal explanation', zh: '规则迁移、因果解释' } },
      { name: { en: 'Teach, then reproduce from memory', zh: '教学-复现' }, detail: { en: 'Observational memory · procedure reproduction', zh: '观察记忆、程序复现' } },
      { name: { en: 'You say, I fetch, from a 12-bay rack', zh: '你说我做（格架取物）' }, detail: { en: 'Reference-frame language · spatial comprehension', zh: '参照物语言、空间理解' } },
      { name: { en: 'Shift handover briefing', zh: '交接说明（拣货班次交接）' }, detail: { en: 'Memory reconstruction · message organisation', zh: '记忆重构、表达组织' } },
    ],
  },

  /* ---- §7.3 general instrumented tasks (L2) ---- */
  {
    key: 'shelving',
    label: { en: 'Shelving · general', zh: '货架 · 通用' },
    scene: SCENE.shelving.name,
    image: SCENE.shelving.image,
    tier: 'L2',
    source: '7.3',
    external: false,
    tasks: [
      { name: { en: 'Return scattered goods to place', zh: '理货归位' }, detail: { en: 'Tidy goods back into category order', zh: '将散乱商品按类归位码齐' } },
      { name: { en: 'Order picking', zh: '按单拣货' }, detail: { en: 'Scan-pick to the order into a basket', zh: '按单扫码拣选入筐' } },
      { name: { en: 'Replenish the shelf', zh: '补货上架' }, detail: { en: 'Restock and check the price labels', zh: '补货并核对价签' } },
      { name: { en: 'Process a return', zh: '退货处理' }, detail: { en: 'Verify, log, put back', zh: '核验、登记、归位' } },
      { name: { en: 'Pick from a memorised list', zh: '记忆清单拣货' }, detail: { en: 'Pick 5–8 items from memory, then verify', zh: '凭记忆完成 5–8 项拣选后核对' } },
      { name: { en: 'Plan a replenishment round', zh: '补货规划上架' }, detail: { en: 'Set order and placement from stock cards', zh: '依据库存卡决定补货顺序与位置' } },
      { name: { en: 'Label audit round', zh: '标签纠错巡查' }, detail: { en: 'Find, correct and log misplaced labels', zh: '找出并纠正混错标签并登记' } },
      { name: { en: 'Shop to a budget', zh: '预算购物拣选' }, detail: { en: 'Compare and substitute within a set budget', zh: '给定预算内完成价比与替代决策' } },
    ],
  },
  {
    key: 'bench',
    label: { en: 'Workbench · general', zh: '工作台 · 通用' },
    scene: SCENE.bench.name,
    image: SCENE.bench.image,
    tier: 'L2',
    source: '7.3',
    external: false,
    tasks: [
      { name: { en: 'Take out and return tools', zh: '工具取用归位' }, detail: { en: 'Take the tools the task needs, return them to place', zh: '按任务取用工具并原位归还' } },
      { name: { en: 'Fastener check', zh: '紧固检查' }, detail: { en: 'Check fasteners point by point and log', zh: '逐点检查紧固并记录' } },
      { name: { en: 'Bundle and label cables', zh: '线材整理捆扎' }, detail: { en: 'Route, bundle and label the cabling', zh: '理线捆扎并贴标' } },
      { name: { en: 'Connect the equipment set', zh: '设备插拔连接' }, detail: { en: 'Wire the set from the diagram and power it up', zh: '按图连接整套设备并点亮' } },
      { name: { en: 'Clean the screen and housing', zh: '屏幕清洁维护' }, detail: { en: 'Clean screen and housing, return the kit', zh: '清洁屏幕外壳并归位' } },
    ],
  },
  {
    key: 'laundry',
    label: { en: 'Laundry area · general', zh: '洗衣区 · 通用' },
    scene: SCENE.laundry.name,
    image: SCENE.laundry.image,
    tier: 'L2',
    source: '7.3',
    external: false,
    tasks: [
      { name: { en: 'Sort and load the washer', zh: '衣物分类装填' }, detail: { en: 'Sort by colour and fabric, load the drum', zh: '按颜色/材质分类装入洗衣机' } },
      { name: { en: 'Run a standard cycle', zh: '常规程序洗涤' }, detail: { en: 'Complete one wash on the standard programme', zh: '选择标准程序完成一次洗涤' } },
      { name: { en: 'Hang the wash out', zh: '晾晒' }, detail: { en: 'Hang each item smooth after washing', zh: '洗后逐件晾挂平整' } },
      { name: { en: 'Fold and stow', zh: '折叠入柜' }, detail: { en: 'Fold and put away by person', zh: '折叠并按人分类入柜' } },
      { name: { en: 'Choose the wash programme', zh: '洗衣机程序决策' }, detail: { en: 'Decide programme and detergent dose from care labels and stains', zh: '按洗标与污渍选择程序并配比洗涤剂' } },
    ],
  },
  {
    key: 'desk',
    label: { en: 'Desk · general', zh: '书桌 · 通用' },
    scene: SCENE.desk.name,
    image: SCENE.desk.image,
    tier: 'L2',
    source: '7.3',
    external: false,
    tasks: [
      { name: { en: 'Sort and bag', zh: '分拣包装' }, detail: { en: 'Sort the mixed box by category, bag and seal', zh: '将杂件箱内物品按类别分拣后装袋封口' } },
      { name: { en: 'File by label', zh: '分类归档' }, detail: { en: 'File cards into folders by the label rule', zh: '按标签规则将卡片归入对应文件夹' } },
      { name: { en: 'Stamp and seal', zh: '盖章装封' }, detail: { en: 'Check the letter, stamp, seal and stack', zh: '核对信件、盖章、封口、码放' } },
      { name: { en: 'Screwdriver assembly', zh: '螺丝批装配' }, detail: { en: 'Drive screws into matching holes from a sample board', zh: '参照样品板将螺丝拧入对应孔位' } },
    ],
  },
  {
    key: 'cooktop',
    label: { en: 'Cooktop · general', zh: '灶台 · 通用' },
    scene: SCENE.cooktop.name,
    image: SCENE.cooktop.image,
    tier: 'L2',
    source: '7.3',
    external: false,
    tasks: [
      { name: { en: 'Assemble a sandwich', zh: '三明治组装' }, detail: { en: 'Layer and wrap to the order card', zh: '按订单卡分层组装并包装' } },
      { name: { en: 'Make a light meal', zh: '简餐制作' }, detail: { en: 'Make one sandwich and brew a drink', zh: '制作一份三明治并冲泡饮品' } },
      { name: { en: 'Boil water and brew tea', zh: '烧水泡茶' }, detail: { en: 'Boil, warm the cups, brew, serve', zh: '烧水、温杯、冲泡、奉茶' } },
      { name: { en: 'Wash and return the cookware', zh: '锅具清洗归位' }, detail: { en: 'Wash, drain and put the cookware back', zh: '清洗锅具、沥干部位归位' } },
    ],
  },
  {
    key: 'prep',
    label: { en: 'Prep counter · general', zh: '备菜台 · 通用' },
    scene: SCENE.prep.name,
    image: SCENE.prep.image,
    tier: 'L2',
    source: '7.3',
    external: false,
    tasks: [
      { name: { en: 'Wash and drain vegetables', zh: '洗菜沥水' }, detail: { en: 'Wash the vegetables, drain into a bowl', zh: '清洗蔬菜并沥水装盆' } },
      { name: { en: 'Cut to specification', zh: '切配规格' }, detail: { en: 'Julienne, dice and slice to the spec card', zh: '按规格卡完成丝/丁/片三种刀工' } },
      { name: { en: 'Weigh and portion', zh: '称量分装' }, detail: { en: 'Weigh and portion to the recipe card', zh: '按配方卡称量并分装' } },
      { name: { en: 'Plate and pass', zh: '备菜传盘' }, detail: { en: 'Plate the prepared items, film and pass them on', zh: '将切配成品装盘封膜并传送' } },
    ],
  },
  {
    key: 'wardrobe',
    label: { en: 'Wardrobe · general', zh: '衣柜 · 通用' },
    scene: SCENE.wardrobe.name,
    image: SCENE.wardrobe.image,
    tier: 'L2',
    source: '7.3',
    external: false,
    tasks: [
      { name: { en: 'Hang garments', zh: '衣物挂放' }, detail: { en: 'Hang garments at even spacing', zh: '挂放衣物并间距均匀' } },
      { name: { en: 'Organise storage boxes', zh: '收纳箱整理' }, detail: { en: 'Pack by season and label the boxes', zh: '按季分类装箱并贴标' } },
      { name: { en: 'Rotate the season', zh: '换季整理' }, detail: { en: 'Sort seasonal items out and stow the rest', zh: '按季分类整理并归位收纳' } },
    ],
  },
  {
    key: 'dining',
    label: { en: 'Dining table · general', zh: '餐桌 · 通用' },
    scene: SCENE.dining.name,
    image: SCENE.dining.image,
    tier: 'L2',
    source: '7.3',
    external: false,
    tasks: [
      { name: { en: 'Set the table', zh: '餐具摆台' }, detail: { en: 'Lay a four-place setting to spec', zh: '按四人位规范完成摆台' } },
      { name: { en: 'Fold clothes', zh: '衣物折叠' }, detail: { en: 'Fold by the standard method and stack in layers', zh: '按标准手法折叠并分层码放' } },
    ],
  },
  {
    key: 'bed',
    label: { en: 'Bed · general', zh: '床铺 · 通用' },
    scene: SCENE.bed.name,
    image: SCENE.bed.image,
    tier: 'L2',
    source: '7.3',
    external: false,
    tasks: [
      { name: { en: 'Make the bed', zh: '铺床' }, detail: { en: 'Lay the bedding flat in order and square the corners', zh: '依次铺平床品并整理边角' } },
      { name: { en: 'Change pillowcase and duvet cover', zh: '换枕套被套' }, detail: { en: 'Swap the covers and stack the old ones', zh: '拆旧换新并码放旧品' } },
    ],
  },
  {
    key: 'bath',
    label: { en: 'Bathroom · general', zh: '卫浴 · 通用' },
    scene: SCENE.bath.name,
    image: SCENE.bath.image,
    tier: 'L2',
    source: '7.3',
    external: false,
    tasks: [
      { name: { en: 'Clean the counter and mirror', zh: '台面清洁' }, detail: { en: 'Clean counter and mirror in order', zh: '按顺序清洁台面与镜面' } },
      { name: { en: 'Put toiletries back', zh: '用品归位' }, detail: { en: 'Sort them into place and wipe the bottles', zh: '分类归位并擦拭瓶身' } },
    ],
  },
  {
    key: 'bedroom',
    label: { en: 'Bedroom · general', zh: '卧室 · 通用' },
    scene: SCENE.bedroom.name,
    image: SCENE.bedroom.image,
    tier: 'L2',
    source: '7.3',
    external: false,
    tasks: [
      { name: { en: 'Plan suitcase packing', zh: '行李箱收纳规划' }, detail: { en: 'Plan the packing against a list, then verify', zh: '按清单规划空间装箱并复核' } },
    ],
  },

  /* ---- §7.2b dual interaction, ordinary, L2 baseline ---- */
  {
    key: 'dual-ord',
    label: { en: 'Dual table · ordinary', zh: '双人桌 · 普通' },
    scene: SCENE.dual.name,
    image: SCENE.dual.image,
    tier: 'L2',
    source: '7.2b',
    external: false,
    tasks: [
      { name: { en: 'Alternating line assembly', zh: '轮流流水装配' }, detail: { en: 'Division negotiation · rhythm synchrony', zh: '分工协商、节律同步' } },
      { name: { en: 'Two-person coordinated lifting', zh: '双人协作抬放' }, detail: { en: 'Force coordination · timing communication', zh: '力协同、时机沟通' } },
      { name: { en: 'Synchronised folding', zh: '双人同步折叠' }, detail: { en: 'Motion synchrony · spatial alignment', zh: '动作同步、空间对齐' } },
      { name: { en: 'Pass-along sorting chain', zh: '传递链分拣' }, detail: { en: 'Division of labour · pace matching', zh: '分工协作、节奏配合' } },
      { name: { en: 'Zoned cleaning, two people', zh: '双人分区清洁' }, detail: { en: 'Zone negotiation · parallel work', zh: '区域协商、并行作业' } },
      { name: { en: 'Shadowing inspection round', zh: '带教巡查' }, detail: { en: 'Observational learning · on-the-spot assistance', zh: '观察学习、即时辅助' } },
    ],
  },

  /* ---- §7.4 portable capture in external scenes (L2) ---- */
  {
    key: 'market',
    label: { en: 'Supermarket', zh: '商超' },
    scene: SCENE.market.name,
    image: SCENE.market.image,
    tier: 'L2',
    source: '7.4',
    external: true,
    tasks: [
      { name: { en: 'Shelf tidying segment', zh: '货架理货段' }, detail: { en: 'Tidy and restock one shelf bay, standing', zh: '站定完成一段货架的理货归位' } },
      { name: { en: 'Produce weighing and packing', zh: '生鲜称重包装段' }, detail: { en: 'Weigh, box, film, put on the shelf', zh: '称重、装盒、封膜、上架' } },
      { name: { en: 'Returns handling segment', zh: '退货处理段' }, detail: { en: 'Verify, log, put back', zh: '核验、登记、归位' } },
    ],
  },
  {
    key: 'kitchen-ext',
    label: { en: 'Home kitchen', zh: '家庭厨房' },
    scene: SCENE.homeKitchen.name,
    image: SCENE.homeKitchen.image,
    tier: 'L2',
    source: '7.4',
    external: true,
    tasks: [
      { name: { en: 'Sandwich-making segment', zh: '三明治制作段' }, detail: { en: 'Make two sandwiches from a fixed menu', zh: '固定菜单完成两份三明治' } },
      { name: { en: 'Tableware washing segment', zh: '餐具清洗整理段' }, detail: { en: 'Wash, drain, put away', zh: '清洗、沥干、归位' } },
    ],
  },
  {
    key: 'pharmacy',
    label: { en: 'Pharmacy', zh: '药房' },
    scene: SCENE.pharmacy.name,
    image: SCENE.pharmacy.image,
    tier: 'L2',
    source: '7.4',
    external: true,
    tasks: [
      { name: { en: 'Prescription check and dispensing', zh: '处方核对配药段' }, detail: { en: 'Check and pick against a prescription', zh: '按处方核对并拣选' } },
      { name: { en: 'Restocking segment', zh: '货架补药段' }, detail: { en: 'Replenish the shelf to the list', zh: '按单补货上架' } },
    ],
  },
  {
    key: 'salon',
    label: { en: 'Hair salon', zh: '美发店' },
    scene: SCENE.salon.name,
    image: SCENE.salon.image,
    tier: 'L2',
    source: '7.4',
    external: true,
    tasks: [
      { name: { en: 'Assisted hair wash and blow-dry', zh: '洗头吹风辅助段' }, detail: { en: 'Assist through the full wash and blow-dry', zh: '协助完成洗头吹风全流程' } },
      { name: { en: 'Tool sterilising segment', zh: '工具消毒归位段' }, detail: { en: 'Sterilise, wipe, put back', zh: '消毒、擦拭、归位' } },
    ],
  },
  {
    key: 'cafe',
    label: { en: 'Café', zh: '咖啡馆' },
    scene: SCENE.cafe.name,
    image: SCENE.cafe.image,
    tier: 'L2',
    source: '7.4',
    external: true,
    tasks: [
      { name: { en: 'Single-drink preparation', zh: '单品制作段' }, detail: { en: 'Make one drink end to end', zh: '制作一杯饮品全流程' } },
      { name: { en: 'Bar cleaning and restocking', zh: '吧台清洁补货段' }, detail: { en: 'Clean the bar and top up consumables', zh: '清洁台面并补充耗材' } },
    ],
  },
]

/** Entries at one station, counted off the rows above rather than asserted. */
export const entriesOf = (row: TaskRow) => row.tasks.length

/** Total enumerated task entries and the split between the two tiers. */
export const TASK_TOTALS = TASK_ROWS.reduce(
  (acc, row) => {
    const n = entriesOf(row)
    acc.total += n
    acc[row.tier] += n
    return acc
  },
  { total: 0, L2: 0, L3: 0 } as { total: number; L2: number; L3: number },
)

/** The heaviest single station, so every bar can be drawn to one scale. */
export const TASK_MAX = Math.max(...TASK_ROWS.map(entriesOf))

export interface TaskBand {
  id: 'L3' | 'L2' | 'L1'
  label: Bi
  note: Bi
  color: string
}

/**
 * The three tiers in the order the pyramid reads, top down. L1 is present as a
 * band with no stations because its absence is a fact about the protocol, not
 * an omission from the figure.
 */
export const TASK_BANDS: TaskBand[] = [
  {
    id: 'L3',
    label: { en: 'L3 · Perceptual construction', zh: 'L3 · 知觉建构' },
    note: {
      en: 'High-cognitive work only, seated or standing at a fixed desk, workbench or dual-interaction table, because the EEG amplifier stays tethered to the host.',
      zh: '仅高思维任务，坐姿或站定于固定书桌、工作台或双人交互桌；脑电放大器连线固定主机，故工位不可移动。',
    },
    color: 'var(--c-violet)',
  },
  {
    id: 'L2',
    label: { en: 'L2 · Enhanced modality', zh: 'L2 · 增强模态' },
    note: {
      en: 'Every instrumented task that needs to leave a fixed workstation, plus the dual-interaction baseline and the portable off-site segments.',
      zh: '所有需要离开固定工位的仪器化任务，另含双人交互基线任务与外采便携段。',
    },
    color: 'var(--c-teal)',
  },
  {
    id: 'L1',
    label: { en: 'L1 · Open scene', zh: 'L1 · 开放场景' },
    note: {
      en: 'Runs the same ontology as a passive natural stream: no script, no intervention, so the protocol enumerates no entries here and none are drawn.',
      zh: '复用同一任务本体，以自然流被动采集：不干预、不脚本，故协议不枚举条目，此层不绘制任何条目。',
    },
    color: 'var(--c-blue)',
  },
]

/** Stations of one band, heaviest first, with external scenes kept separate. */
export function taskRowsOf(bandId: TaskBand['id'], external = false): TaskRow[] {
  if (bandId === 'L1') return []
  return TASK_ROWS.filter((row) => row.tier === bandId && row.external === external).sort(
    (a, b) => entriesOf(b) - entriesOf(a),
  )
}
