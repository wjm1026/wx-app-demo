import type { Category } from '@/api'

type CategoryCopyPreset = {
  names: string[]
  description: string
  heroDescription?: string
}

type CategoryCopyInput = Pick<Category, 'name' | 'description'> | null | undefined

const DEFAULT_DESCRIPTION = '从熟悉的小事物开始，边看边听慢慢学。'
const DEFAULT_HERO_DESCRIPTION = '点一点主题插画，听一听发音，用更轻松的方式陪宝宝认识世界。'

const CATEGORY_COPY_PRESETS: CategoryCopyPreset[] = [
  {
    names: ['动作', '行为'],
    description: '跟着跑跳挥手这些动作，一边看一边学表达。',
    heroDescription: '从跑、跳、挥手这些熟悉动作开始，让宝宝把看到的行为和听到的词慢慢对上号。',
  },
  {
    names: ['人物', '人物称呼', '家人', '家庭成员'],
    description: '认识家人朋友和常见称呼，开口表达更自然。',
    heroDescription: '从家人、朋友到熟悉的大人角色，帮助宝宝在日常生活里更自然地开口称呼。',
  },
  {
    names: ['身体部位', '身体', '部位'],
    description: '从头到脚慢慢认，知道身体每一部分。',
    heroDescription: '从头、手、脚这些最熟悉的部位开始，边看边听更容易建立身体认知。',
  },
  {
    names: ['自然', '大自然'],
    description: '看看天气花草和山海，感受身边的大自然。',
    heroDescription: '从天气、植物到山海景象，带宝宝慢慢认识身边真实又丰富的自然世界。',
  },
  {
    names: ['字母', '英文字母', 'alphabet'],
    description: '从 A 到 Z 认识字母，为英语启蒙打基础。',
    heroDescription: '用清晰插画和发音认识字母，让宝宝先熟悉字形和读音，为英语启蒙打下基础。',
  },
  {
    names: ['数字', '数数'],
    description: '看数字、数数量，慢慢建立数字感觉。',
    heroDescription: '把数字形状和数量感连在一起，让宝宝在听、看、数的过程中建立数字启蒙。',
  },
  {
    names: ['衣物', '服装', '穿搭'],
    description: '认识每天会穿会用的衣物，学会生活表达。',
    heroDescription: '从上衣、裤子到鞋帽袜子，帮助宝宝把每天看到的穿着和名称对应起来。',
  },
  {
    names: ['形状', '图形'],
    description: '圆形三角形一起认，观察生活里的形状。',
    heroDescription: '把圆形、方形、三角形这些基础图形认清楚，更容易观察和描述身边的东西。',
  },
  {
    names: ['颜色', '色彩'],
    description: '红黄蓝绿慢慢分，学会描述看到的颜色。',
    heroDescription: '从红黄蓝绿这些常见颜色开始，让宝宝更容易说出眼前看到的色彩变化。',
  },
  {
    names: ['主食'],
    description: '从米饭面条馒头开始，认识常见主食。',
    heroDescription: '从米饭、面条、包子这些熟悉主食开始，让宝宝更轻松认识日常饮食。',
  },
  {
    names: ['食物', '美食'],
    description: '认识餐桌上的常见食物，吃饭聊天更轻松。',
    heroDescription: '把餐桌上常见的食物一点点认出来，让宝宝在吃饭、点餐和聊天时更敢表达。',
  },
  {
    names: ['水果'],
    description: '苹果香蕉葡萄一起认，感受香甜水果世界。',
    heroDescription: '从苹果、香蕉到葡萄草莓，带宝宝认识香甜又常见的水果朋友。',
  },
  {
    names: ['蔬菜'],
    description: '从胡萝卜到青菜，认识常见蔬菜朋友。',
    heroDescription: '把胡萝卜、青菜、番茄这些蔬菜慢慢认熟，让宝宝更愿意观察和表达日常食材。',
  },
  {
    names: ['动物'],
    description: '认识陆地海洋和天空里的动物朋友。',
    heroDescription: '从小狗小猫到海洋和森林里的动物朋友，带宝宝认识更丰富的生命世界。',
  },
  {
    names: ['交通工具', '交通', '出行'],
    description: '汽车火车飞机一起看，认识出行好伙伴。',
    heroDescription: '从汽车、火车到飞机轮船，帮助宝宝认识每天会见到的出行工具。',
  },
  {
    names: ['职业'],
    description: '认识医生老师警察，了解大家在做什么。',
    heroDescription: '从老师、医生到警察消防员，让宝宝对身边常见职业有更直观的认识。',
  },
  {
    names: ['乐器', '音乐'],
    description: '听一听敲一敲，认识会发声的乐器。',
    heroDescription: '从钢琴、鼓到吉他和小提琴，让宝宝在看图和听词里认识不同乐器。',
  },
  {
    names: ['日用品', '生活用品'],
    description: '把家里常见用品认清楚，生活表达更自然。',
    heroDescription: '从杯子、牙刷到毛巾雨伞，帮助宝宝更自然地说出每天会用到的生活用品。',
  },
  {
    names: ['玩具'],
    description: '从积木玩偶到球类，认识喜欢的玩具。',
    heroDescription: '把积木、玩偶、小球这些熟悉玩具认出来，让宝宝在玩耍时更愿意主动表达。',
  },
]

function normalizeCategoryName(name?: string) {
  return String(name || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
}

function findCategoryPreset(name?: string) {
  const normalized = normalizeCategoryName(name)
  if (!normalized) {
    return null
  }

  return CATEGORY_COPY_PRESETS.find((preset) =>
    preset.names.some((alias) => {
      const normalizedAlias = normalizeCategoryName(alias)
      return normalized === normalizedAlias || normalized.includes(normalizedAlias)
    }),
  ) || null
}

export function getCategoryDescriptionText(category: CategoryCopyInput) {
  const preset = findCategoryPreset(category?.name)
  if (preset?.description) {
    return preset.description
  }

  const description = String(category?.description || '').trim()
  if (description) {
    return description
  }

  return DEFAULT_DESCRIPTION
}

export function getCategoryHeroDescriptionText(category: CategoryCopyInput) {
  const preset = findCategoryPreset(category?.name)
  if (preset?.heroDescription) {
    return preset.heroDescription
  }

  const description = String(category?.description || '').trim()
  if (description) {
    return `${description}，边看边听更容易记住。`
  }

  return DEFAULT_HERO_DESCRIPTION
}
