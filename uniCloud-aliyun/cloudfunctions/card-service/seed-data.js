const DEFAULT_TEXT_COLOR = '1F2937'
const { buildCardImageFields } = require('./image-data')

/** 创建语音地址 */
function createVoiceUrl(word, lang = 'zh') {
  if (!word) {
    return ''
  }

  if (lang === 'en') {
    return `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(word)}&type=2`
  }

  return `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(word)}&le=zh`
}

/** 构建说明 */
function buildDescription(category, item) {
  const templates = {
    '动物': `${item.name}是孩子常见的动物认知词汇，适合一起观察它的外形、颜色和生活环境。`,
    '水果': `${item.name}是生活里常见的水果，可以顺手认识它的颜色、味道和切开后的样子。`,
    '蔬菜': `${item.name}经常出现在餐桌上，适合孩子认识它的颜色、形状和简单做法。`,
    '交通工具': `${item.name}是常见交通工具，能帮助孩子理解它的用途、速度和安全常识。`,
    '颜色': `${item.name}是基础颜色词，孩子可以在玩具、衣服和绘画里反复看到它。`,
    '形状': `${item.name}是基础几何形状，生活里很多物品都能找到和它相似的轮廓。`,
    '日常用品': `${item.name}是家里和校园里常见的生活用品，适合建立真实场景认知。`,
    '家庭成员': `${item.name}是家庭成员称呼之一，能帮助孩子更清楚地表达人与人的关系。`,
    '自然天气': `${item.name}来自自然和天气主题，适合孩子认识季节变化和周围环境。`,
    '食物': `${item.name}是孩子常见的食物词汇，可以一起认识它的味道、形状和吃法。`
  }

  return templates[category.name] || `${item.name}属于${category.name}主题，适合孩子进行基础认知和语言启蒙。`
}

/** 处理去重标签相关逻辑 */
function uniqueTags(categoryName, item) {
  return Array.from(
    new Set([
      categoryName,
      item.name,
      item.en,
      ...(item.tags || [])
    ])
  )
}

/** 创建种子数据 */
function createSeedData() {
  const now = Date.now()

  const categories = [
    {
      name: '动物',
      icon: '🦁',
      color: '#FF9F7F',
      gradient: 'linear-gradient(135deg, #FFD8C8, #FFB38A)',
      description: '认识陆地和海洋里的动物朋友。',
      palette: ['FFE8DE', 'FFD2BF', 'FFC1A6'],
      textColor: DEFAULT_TEXT_COLOR,
      baseViews: 2600,
      items: [
        { name: '老虎', en: 'Tiger', pinyin: 'laohu lao hu', fact: '每只老虎的条纹都像指纹一样独一无二。', tags: ['森林', '条纹', '大型猫科'], hot: true },
        { name: '狮子', en: 'Lion', pinyin: 'shizi shi zi', fact: '雄狮的鬃毛会让它看起来更威风。', tags: ['草原', '鬃毛', '群居'], hot: true },
        { name: '大象', en: 'Elephant', pinyin: 'daxiang da xiang', fact: '大象的长鼻子既能拿东西，也能吸水喷水。', tags: ['长鼻子', '大型动物'], hot: true },
        { name: '熊猫', en: 'Panda', pinyin: 'xiongmao xiong mao', fact: '熊猫最爱吃竹子，也很会爬树。', tags: ['竹子', '黑白色'], hot: true },
        { name: '长颈鹿', en: 'Giraffe', pinyin: 'changjinglu chang jing lu', fact: '长颈鹿能吃到高处树叶，因为它的脖子特别长。', tags: ['长脖子', '斑纹'] },
        { name: '斑马', en: 'Zebra', pinyin: 'banma ban ma', fact: '斑马的黑白条纹像天然外套，还能帮助它们躲避天敌。', tags: ['黑白条纹', '草原'] },
        { name: '猴子', en: 'Monkey', pinyin: 'houzi hou zi', fact: '猴子喜欢攀爬和跳跃，尾巴还能帮助保持平衡。', tags: ['攀爬', '尾巴'] },
        { name: '海豚', en: 'Dolphin', pinyin: 'haitun hai tun', fact: '海豚会用声音和同伴交流，也很喜欢跃出水面。', tags: ['海洋', '聪明', '会游泳'] }
      ]
    },
    {
      name: '水果',
      icon: '🍎',
      color: '#7ED321',
      gradient: 'linear-gradient(135deg, #E2F9C8, #AEEB74)',
      description: '认识颜色丰富的水果伙伴。',
      palette: ['ECFCD9', 'DBF8BE', 'C7EE9E'],
      textColor: DEFAULT_TEXT_COLOR,
      baseViews: 2400,
      items: [
        { name: '苹果', en: 'Apple', pinyin: 'pingguo ping guo', fact: '苹果切开后，里面的果核常常像一颗小星星。', tags: ['红色', '脆甜'], hot: true },
        { name: '香蕉', en: 'Banana', pinyin: 'xiangjiao xiang jiao', fact: '香蕉成熟后会变黄，还会一根根长成一串。', tags: ['黄色', '软糯'], hot: true },
        { name: '草莓', en: 'Strawberry', pinyin: 'caomei cao mei', fact: '草莓表面的小点点其实也是果实的一部分。', tags: ['红色', '香甜'], hot: true },
        { name: '西瓜', en: 'Watermelon', pinyin: 'xigua xi gua', fact: '西瓜水分很多，夏天吃起来特别清爽。', tags: ['夏天', '绿色外皮'], hot: true },
        { name: '橙子', en: 'Orange', pinyin: 'chengzi cheng zi', fact: '橙子皮里有香香的小油胞，轻轻一捏就会喷香味。', tags: ['橙色', '果汁'] },
        { name: '葡萄', en: 'Grape', pinyin: 'putao pu tao', fact: '葡萄会一颗颗长在藤上，颜色有绿有紫。', tags: ['一串串', '紫色'] },
        { name: '芒果', en: 'Mango', pinyin: 'mangguo mang guo', fact: '芒果闻起来很香，果肉颜色像小太阳。', tags: ['热带水果', '香甜'] },
        { name: '梨', en: 'Pear', pinyin: 'li', fact: '梨子咬起来脆脆的，水分很足。', tags: ['清甜', '多汁'] }
      ]
    },
    {
      name: '蔬菜',
      icon: '🥦',
      color: '#34D399',
      gradient: 'linear-gradient(135deg, #D7FBEA, #8EE4B8)',
      description: '认识餐桌上常见的蔬菜。',
      palette: ['E4FCF0', 'CFF7E2', 'B7EFD2'],
      textColor: DEFAULT_TEXT_COLOR,
      baseViews: 2100,
      items: [
        { name: '胡萝卜', en: 'Carrot', pinyin: 'huluobo hu luo bo', fact: '胡萝卜最常见是橙色，也有紫色和黄色。', tags: ['橙色', '根茎类'], hot: true },
        { name: '西兰花', en: 'Broccoli', pinyin: 'xilanhua xi lan hua', fact: '西兰花看起来像一棵迷你小树。', tags: ['绿色', '小树'], hot: true },
        { name: '玉米', en: 'Corn', pinyin: 'yumi yu mi', fact: '玉米粒会一排排整齐地长在玉米棒上。', tags: ['黄色', '颗粒'], hot: true },
        { name: '土豆', en: 'Potato', pinyin: 'tudou tu dou', fact: '土豆长在泥土里，是地下茎。', tags: ['地下', '圆滚滚'] },
        { name: '西红柿', en: 'Tomato', pinyin: 'xihongshi xi hong shi', fact: '西红柿既能当菜，也常被大家当作水果。', tags: ['红色', '汁水多'], hot: true },
        { name: '黄瓜', en: 'Cucumber', pinyin: 'huanggua huang gua', fact: '黄瓜摸起来凉凉的，里面藏着很多小籽。', tags: ['绿色', '长条形'] },
        { name: '茄子', en: 'Eggplant', pinyin: 'qiezi qie zi', fact: '茄子常见是紫色，也有白色和绿色。', tags: ['紫色', '光滑'] },
        { name: '南瓜', en: 'Pumpkin', pinyin: 'nangua nan gua', fact: '成熟的南瓜常常圆滚滚，颜色很亮。', tags: ['橙色', '圆形'] }
      ]
    },
    {
      name: '交通工具',
      icon: '🚗',
      color: '#60A5FA',
      gradient: 'linear-gradient(135deg, #DAEAFE, #9BC5FF)',
      description: '认识会跑、会飞、会航行的交通工具。',
      palette: ['E8F3FF', 'D3E6FF', 'BCD8FF'],
      textColor: DEFAULT_TEXT_COLOR,
      baseViews: 2800,
      items: [
        { name: '汽车', en: 'Car', pinyin: 'qiche qi che', fact: '汽车有四个轮子，是最常见的出行工具之一。', tags: ['四个轮子', '道路'], hot: true },
        { name: '公交车', en: 'Bus', pinyin: 'gongjiaoche gong jiao che', fact: '公交车一次能载很多人一起出行。', tags: ['城市', '很多座位'], hot: true },
        { name: '火车', en: 'Train', pinyin: 'huoche huo che', fact: '火车跑在铁轨上，能拉很多车厢。', tags: ['铁轨', '长长的'], hot: true },
        { name: '飞机', en: 'Airplane', pinyin: 'feiji fei ji', fact: '飞机能在高高的天空里飞得很快。', tags: ['天空', '翅膀'], hot: true },
        { name: '自行车', en: 'Bicycle', pinyin: 'zixingche zi xing che', fact: '自行车靠脚踩踏板前进，是很环保的出行方式。', tags: ['踏板', '两个轮子'] },
        { name: '轮船', en: 'Ship', pinyin: 'lunchuan lun chuan', fact: '轮船能在江河湖海上航行。', tags: ['水上', '航行'] },
        { name: '消防车', en: 'Fire Truck', pinyin: 'xiaofangche xiao fang che', fact: '消防车会带着水和工具去帮助灭火。', tags: ['救援', '红色'] },
        { name: '挖掘机', en: 'Excavator', pinyin: 'wajueji wa jue ji', fact: '挖掘机的机械臂可以挖土和搬运东西。', tags: ['工程车', '机械臂'] }
      ]
    },
    {
      name: '颜色',
      icon: '🎨',
      color: '#A78BFA',
      gradient: 'linear-gradient(135deg, #E8E0FF, #C9B6FF)',
      description: '认识生活里最常见的颜色。',
      palette: ['F0EAFF', 'E0D4FF', 'D0BFFF'],
      textColor: DEFAULT_TEXT_COLOR,
      baseViews: 1900,
      items: [
        { name: '红色', en: 'Red', pinyin: 'hongse hong se', fact: '红色常让人想到苹果、草莓和小花。', tags: ['颜色', '鲜艳'], hot: true },
        { name: '蓝色', en: 'Blue', pinyin: 'lanse lan se', fact: '蓝色像晴朗的天空和宽宽的大海。', tags: ['天空', '海洋'], hot: true },
        { name: '黄色', en: 'Yellow', pinyin: 'huangse huang se', fact: '黄色像太阳、柠檬和小鸭子。', tags: ['太阳', '明亮'], hot: true },
        { name: '绿色', en: 'Green', pinyin: 'lvse lv se', fact: '绿色常出现在树叶、草地和西兰花上。', tags: ['树叶', '草地'], hot: true },
        { name: '橙色', en: 'Orange Color', pinyin: 'chengse cheng se', fact: '橙色像胡萝卜和橘子皮，暖暖的很有活力。', tags: ['胡萝卜', '明快'] },
        { name: '紫色', en: 'Purple', pinyin: 'zise zi se', fact: '紫色常见在葡萄、茄子和一些小花上。', tags: ['葡萄', '梦幻'] },
        { name: '白色', en: 'White', pinyin: 'baise bai se', fact: '白色像牛奶、云朵和冬天的雪。', tags: ['雪花', '牛奶'] },
        { name: '黑色', en: 'Black', pinyin: 'heise hei se', fact: '黑色像夜晚，也像熊猫的耳朵和眼圈。', tags: ['夜晚', '熊猫'] }
      ]
    },
    {
      name: '形状',
      icon: '🔺',
      color: '#F59E0B',
      gradient: 'linear-gradient(135deg, #FFF1D4, #FFD37A)',
      description: '认识常见的几何形状。',
      palette: ['FFF7E5', 'FFEBC2', 'FFDFA0'],
      textColor: DEFAULT_TEXT_COLOR,
      baseViews: 1800,
      items: [
        { name: '圆形', en: 'Circle', pinyin: 'yuanxing yuan xing', fact: '皮球、盘子和太阳看起来都像圆形。', tags: ['皮球', '没有角'], hot: true },
        { name: '正方形', en: 'Square', pinyin: 'zhengfangxing zheng fang xing', fact: '正方形有四条一样长的边。', tags: ['四条边', '一样长'], hot: true },
        { name: '三角形', en: 'Triangle', pinyin: 'sanjiaoxing san jiao xing', fact: '三角形有三个角，屋顶和路牌常能看到它。', tags: ['三个角', '屋顶'], hot: true },
        { name: '长方形', en: 'Rectangle', pinyin: 'changfangxing chang fang xing', fact: '书本、门和积木常常接近长方形。', tags: ['书本', '门'], hot: true },
        { name: '星形', en: 'Star', pinyin: 'xingxing xing xing', fact: '五角星就是最常见的星形。', tags: ['五角星', '发光'] },
        { name: '心形', en: 'Heart', pinyin: 'xinxing xin xing', fact: '心形常用来表示喜欢和关心。', tags: ['爱心', '喜欢'] },
        { name: '椭圆形', en: 'Oval', pinyin: 'tuoyuanxing tuo yuan xing', fact: '鸡蛋和橄榄的轮廓常常接近椭圆形。', tags: ['鸡蛋', '圆润'] },
        { name: '菱形', en: 'Diamond Shape', pinyin: 'lingxing ling xing', fact: '风筝和一些路牌看起来像菱形。', tags: ['风筝', '斜斜的'] }
      ]
    },
    {
      name: '日常用品',
      icon: '🧸',
      color: '#FB7185',
      gradient: 'linear-gradient(135deg, #FFE0E6, #FFB4C1)',
      description: '认识家里和学校常见的物品。',
      palette: ['FFEAF0', 'FFD4DD', 'FFC0CB'],
      textColor: DEFAULT_TEXT_COLOR,
      baseViews: 2000,
      items: [
        { name: '杯子', en: 'Cup', pinyin: 'beizi bei zi', fact: '杯子可以装水、牛奶和果汁。', tags: ['喝水', '容器'], hot: true },
        { name: '牙刷', en: 'Toothbrush', pinyin: 'yashua ya shua', fact: '牙刷能帮助我们早晚清洁牙齿。', tags: ['刷牙', '卫生'], hot: true },
        { name: '书包', en: 'Schoolbag', pinyin: 'shubao shu bao', fact: '书包里可以装书、本子和文具。', tags: ['上学', '背着走'], hot: true },
        { name: '台灯', en: 'Desk Lamp', pinyin: 'taideng tai deng', fact: '台灯会把桌面照亮，方便晚上看书。', tags: ['照明', '书桌'] },
        { name: '雨伞', en: 'Umbrella', pinyin: 'yusan yu san', fact: '下雨天打开雨伞，就不容易被雨淋湿。', tags: ['下雨', '遮挡'] },
        { name: '闹钟', en: 'Alarm Clock', pinyin: 'naozhong nao zhong', fact: '闹钟会提醒我们按时起床和做事情。', tags: ['时间', '提醒'] },
        { name: '足球', en: 'Soccer Ball', pinyin: 'zuqiu zu qiu', fact: '足球圆滚滚的，是很多小朋友喜欢的运动器材。', tags: ['运动', '球类'] },
        { name: '积木', en: 'Building Blocks', pinyin: 'jimu ji mu', fact: '积木可以拼出房子、桥和各种好玩的造型。', tags: ['玩具', '搭建'] }
      ]
    },
    {
      name: '家庭成员',
      icon: '👨‍👩‍👧',
      color: '#F472B6',
      gradient: 'linear-gradient(135deg, #FFE2F3, #FFC2E0)',
      description: '认识家庭里的成员称呼。',
      palette: ['FFEAF6', 'FFD7EB', 'FFC2E0'],
      textColor: DEFAULT_TEXT_COLOR,
      baseViews: 1700,
      items: [
        { name: '爸爸', en: 'Father', pinyin: 'baba ba ba', fact: '爸爸是家庭里的重要成员之一。', tags: ['家人', '称呼'], hot: true },
        { name: '妈妈', en: 'Mother', pinyin: 'mama ma ma', fact: '妈妈常常温柔地照顾全家。', tags: ['家人', '称呼'], hot: true },
        { name: '哥哥', en: 'Older Brother', pinyin: 'gege ge ge', fact: '哥哥是比自己大的男孩家人。', tags: ['家人', '男孩'], hot: true },
        { name: '姐姐', en: 'Older Sister', pinyin: 'jiejie jie jie', fact: '姐姐是比自己大的女孩家人。', tags: ['家人', '女孩'], hot: true },
        { name: '弟弟', en: 'Younger Brother', pinyin: 'didi di di', fact: '弟弟是比自己小的男孩家人。', tags: ['家人', '男孩'] },
        { name: '妹妹', en: 'Younger Sister', pinyin: 'meimei mei mei', fact: '妹妹是比自己小的女孩家人。', tags: ['家人', '女孩'] },
        { name: '爷爷', en: 'Grandpa', pinyin: 'yeye ye ye', fact: '爷爷常会给孩子讲以前发生过的故事。', tags: ['长辈', '家人'] },
        { name: '奶奶', en: 'Grandma', pinyin: 'nainai nai nai', fact: '奶奶做的饭和点心常常很香。', tags: ['长辈', '家人'] }
      ]
    },
    {
      name: '自然天气',
      icon: '🌦️',
      color: '#22C55E',
      gradient: 'linear-gradient(135deg, #E1F9E9, #B4EECA)',
      description: '认识天空、季节和天气变化。',
      palette: ['ECFCF1', 'D4F7DE', 'BFEFD0'],
      textColor: DEFAULT_TEXT_COLOR,
      baseViews: 1950,
      items: [
        { name: '太阳', en: 'Sun', pinyin: 'taiyang tai yang', fact: '太阳让白天变得明亮和温暖。', tags: ['白天', '温暖'], hot: true },
        { name: '月亮', en: 'Moon', pinyin: 'yueliang yue liang', fact: '月亮在夜空里会有不同的形状。', tags: ['夜晚', '天空'], hot: true },
        { name: '云朵', en: 'Cloud', pinyin: 'yunduo yun duo', fact: '云朵有时像棉花，有时像小动物。', tags: ['天空', '白白的'], hot: true },
        { name: '雨天', en: 'Rain', pinyin: 'yutian yu tian', fact: '下雨时地面会变得湿湿的，还会听到滴答滴答声。', tags: ['下雨', '湿润'] },
        { name: '雪花', en: 'Snowflake', pinyin: 'xuehua xue hua', fact: '雪花轻轻落下时，形状常常很漂亮。', tags: ['冬天', '白色'] },
        { name: '彩虹', en: 'Rainbow', pinyin: 'caihong cai hong', fact: '彩虹通常会出现在雨后放晴的天空里。', tags: ['雨后', '七种颜色'], hot: true },
        { name: '星星', en: 'Star', pinyin: 'xingxing xing xing', fact: '夜晚抬头时，常能看见闪闪的星星。', tags: ['夜晚', '发光'] },
        { name: '大树', en: 'Tree', pinyin: 'dashu da shu', fact: '大树有树干、树枝和叶子，还能带来阴凉。', tags: ['植物', '树叶'] }
      ]
    },
    {
      name: '食物',
      icon: '🍽️',
      color: '#F97316',
      gradient: 'linear-gradient(135deg, #FFE7D7, #FFB98A)',
      description: '认识孩子餐桌上常见的食物。',
      palette: ['FFF0E5', 'FFDCC6', 'FFC6A5'],
      textColor: DEFAULT_TEXT_COLOR,
      baseViews: 2200,
      items: [
        { name: '米饭', en: 'Rice', pinyin: 'mifan mi fan', fact: '米饭是很多家庭餐桌上的主食。', tags: ['主食', '白色'], hot: true },
        { name: '面包', en: 'Bread', pinyin: 'mianbao mian bao', fact: '面包闻起来香香的，常常用小麦做成。', tags: ['主食', '烘焙'], hot: true },
        { name: '鸡蛋', en: 'Egg', pinyin: 'jidan ji dan', fact: '鸡蛋可以蒸、煮，也能做成蛋糕。', tags: ['早餐', '营养'], hot: true },
        { name: '牛奶', en: 'Milk', pinyin: 'niunai niu nai', fact: '牛奶里有蛋白质和钙，很多小朋友都很熟悉。', tags: ['饮品', '白色'], hot: true },
        { name: '面条', en: 'Noodles', pinyin: 'miantiao mian tiao', fact: '面条长长的，煮熟后会变得滑滑软软。', tags: ['主食', '长长的'] },
        { name: '饼干', en: 'Biscuit', pinyin: 'binggan bing gan', fact: '饼干常常是脆脆的小点心。', tags: ['零食', '脆脆的'] },
        { name: '蛋糕', en: 'Cake', pinyin: 'dangao dan gao', fact: '蛋糕上可以放水果、奶油和蜡烛。', tags: ['甜点', '生日'] },
        { name: '汤圆', en: 'Tangyuan', pinyin: 'tangyuan tang yuan', fact: '汤圆圆滚滚的，里面常常有甜甜的馅。', tags: ['节日', '圆形'] }
      ]
    }
  ]

  const categoryRecords = categories.map((category, index) => {
    const sort = (categories.length - index) * 10
    const cover = buildCardImageFields(category.items[0]?.name).image

    return {
      name: category.name,
      icon: category.icon,
      cover,
      color: category.color,
      gradient: category.gradient,
      description: category.description,
      sort,
      card_count: category.items.length,
      status: 1,
      create_time: now - index * 60_000
    }
  })

  return {
    categories: categoryRecords,
    /** 构建卡片列表 */
    buildCards(categoryIds) {
      return categories.flatMap((category, categoryIndex) =>
        category.items.map((item, itemIndex) => {
          const { image, images } = buildCardImageFields(item.name)
          const createdOffset =
            categories
              .slice(0, categoryIndex)
              .reduce((total, current) => total + current.items.length, 0) +
            itemIndex
          const viewCount = Math.max(category.baseViews - itemIndex * 95 + (item.hot ? 260 : 0), 120)

          return {
            category_id: categoryIds[category.name],
            name: item.name,
            name_en: item.en,
            name_pinyin: item.pinyin,
            image,
            images,
            audio: createVoiceUrl(item.name),
            audio_en: createVoiceUrl(item.en, 'en'),
            sound: item.sound || '',
            video: item.video || '',
            description: buildDescription(category, item),
            fun_fact: item.fact,
            tags: uniqueTags(category.name, item),
            is_free: true,
            points_cost: 0,
            view_count: viewCount,
            favorite_count: Math.max(Math.floor(viewCount / 12), 3),
            is_hot: !!item.hot,
            sort: category.items.length - itemIndex,
            status: 1,
            create_time: now - createdOffset * 3_600_000,
            update_time: now - createdOffset * 1_800_000
          }
        })
      )
    }
  }
}

module.exports = {
  createSeedData
}
