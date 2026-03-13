const REAL_CARD_IMAGE_MAP = {
  老虎: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b0/Bengal_tiger_%28Panthera_tigris_tigris%29_female_3_crop.jpg/960px-Bengal_tiger_%28Panthera_tigris_tigris%29_female_3_crop.jpg',
  狮子: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a6/020_The_lion_king_Snyggve_in_the_Serengeti_National_Park_Photo_by_Giles_Laurent.jpg/960px-020_The_lion_king_Snyggve_in_the_Serengeti_National_Park_Photo_by_Giles_Laurent.jpg',
  大象: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/37/African_Bush_Elephant.jpg/960px-African_Bush_Elephant.jpg',
  熊猫: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0f/Grosser_Panda.JPG/960px-Grosser_Panda.JPG',
  长颈鹿: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9e/Giraffe_Mikumi_National_Park.jpg/960px-Giraffe_Mikumi_National_Park.jpg',
  斑马: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/96/Plains_Zebra_Equus_quagga_cropped.jpg/500px-Plains_Zebra_Equus_quagga_cropped.jpg',
  猴子: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/dc/BrownSpiderMonkey_%28edit2%29.jpg/960px-BrownSpiderMonkey_%28edit2%29.jpg',
  海豚: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/10/Tursiops_truncatus_01.jpg/960px-Tursiops_truncatus_01.jpg',
  苹果: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a6/Pink_lady_and_cross_section.jpg/960px-Pink_lady_and_cross_section.jpg',
  香蕉: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/de/Bananavarieties.jpg/330px-Bananavarieties.jpg',
  草莓: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4c/Garden_strawberry_%28Fragaria_%C3%97_ananassa%29_single2.jpg/960px-Garden_strawberry_%28Fragaria_%C3%97_ananassa%29_single2.jpg',
  西瓜: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/47/Taiwan_2009_Tainan_City_Organic_Farm_Watermelon_FRD_7962.jpg/960px-Taiwan_2009_Tainan_City_Organic_Farm_Watermelon_FRD_7962.jpg',
  橙子: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e3/Oranges_-_whole-halved-segment.jpg/960px-Oranges_-_whole-halved-segment.jpg',
  葡萄: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/53/Grapes%2C_Rostov-on-Don%2C_Russia.jpg/960px-Grapes%2C_Rostov-on-Don%2C_Russia.jpg',
  芒果: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/74/Mangos_-_single_and_halved.jpg/960px-Mangos_-_single_and_halved.jpg',
  梨: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cf/Pears.jpg/500px-Pears.jpg',
  胡萝卜: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a2/Vegetable-Carrot-Bundle-wStalks.jpg/960px-Vegetable-Carrot-Bundle-wStalks.jpg',
  西兰花: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/03/Broccoli_and_cross_section_edit.jpg/960px-Broccoli_and_cross_section_edit.jpg',
  玉米: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e3/Zea_mays_-_K%C3%B6hler%E2%80%93s_Medizinal-Pflanzen-283.jpg/330px-Zea_mays_-_K%C3%B6hler%E2%80%93s_Medizinal-Pflanzen-283.jpg',
  土豆: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/Patates.jpg/960px-Patates.jpg',
  西红柿: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/89/Tomato_je.jpg/960px-Tomato_je.jpg',
  黄瓜: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/96/ARS_cucumber.jpg/960px-ARS_cucumber.jpg',
  茄子: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/76/Solanum_melongena_24_08_2012_%281%29.JPG/960px-Solanum_melongena_24_08_2012_%281%29.JPG',
  南瓜: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5c/FrenchMarketPumpkinsB.jpg/960px-FrenchMarketPumpkinsB.jpg',
  汽车: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/12/1925_Ford_Model_T_touring.jpg/960px-1925_Ford_Model_T_touring.jpg',
  公交车: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/84/LTZ1328-19-20241030-160332.jpg/960px-LTZ1328-19-20241030-160332.jpg',
  火车: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/50/%D0%9F%D0%BE%D0%B5%D0%B7%D0%B4_%D0%BD%D0%B0_%D1%84%D0%BE%D0%BD%D0%B5_%D0%B3%D0%BE%D1%80%D1%8B_%D0%A8%D0%B0%D1%82%D1%80%D0%B8%D1%89%D0%B5._%D0%92%D0%BE%D1%80%D0%BE%D0%BD%D0%B5%D0%B6%D1%81%D0%BA%D0%B0%D1%8F_%D0%BE%D0%B1%D0%BB%D0%B0%D1%81%D1%82%D1%8C.jpg/960px-%D0%9F%D0%BE%D0%B5%D0%B7%D0%B4_%D0%BD%D0%B0_%D1%84%D0%BE%D0%BD%D0%B5_%D0%B3%D0%BE%D1%80%D1%8B_%D0%A8%D0%B0%D1%82%D1%80%D0%B8%D1%89%D0%B5._%D0%92%D0%BE%D1%80%D0%BE%D0%BD%D0%B5%D0%B6%D1%81%D0%BA%D0%B0%D1%8F_%D0%BE%D0%B1%D0%BB%D0%B0%D1%81%D1%82%D1%8C.jpg',
  飞机: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/36/United_Airlines_Boeing_777-200_Meulemans.jpg/960px-United_Airlines_Boeing_777-200_Meulemans.jpg',
  自行车: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/41/Left_side_of_Flying_Pigeon.jpg/960px-Left_side_of_Flying_Pigeon.jpg',
  轮船: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/30/Containerterminal_Altenwerder_%28Hamburg-Altenwerder%29.Iris_Bolten.4.phb.ajb.jpg/960px-Containerterminal_Altenwerder_%28Hamburg-Altenwerder%29.Iris_Bolten.4.phb.ajb.jpg',
  消防车: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d0/Dublin_Fire_Brigade_Pump_Ladder_D32.jpg/960px-Dublin_Fire_Brigade_Pump_Ladder_D32.jpg',
  挖掘机: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/82/Excavator_Postiguet_Beach_2.jpg/960px-Excavator_Postiguet_Beach_2.jpg',
  红色: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e1/Strawberries.jpg/960px-Strawberries.jpg',
  蓝色: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f6/Ocean_world_Earth.jpg/960px-Ocean_world_Earth.jpg',
  黄色: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d5/Cornwall_Daffodils.jpg/960px-Cornwall_Daffodils.jpg',
  绿色: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/23/Champ_de_bl%C3%A9_C%C3%B4te-d%27Or_Bourgogne_avril_2014.jpg/960px-Champ_de_bl%C3%A9_C%C3%B4te-d%27Or_Bourgogne_avril_2014.jpg',
  橙色: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d8/Delicatearch.png/960px-Delicatearch.png',
  紫色: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f8/Iris_sanguinea_cultivar%2C_Wakehurst_Place%2C_UK_-_Diliff.jpg/960px-Iris_sanguinea_cultivar%2C_Wakehurst_Place%2C_UK_-_Diliff.jpg',
  白色: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e2/Delphinapterus_leucas_2.jpg/960px-Delphinapterus_leucas_2.jpg',
  黑色: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/69/Black_kitten_July_August_2009-1.jpg/960px-Black_kitten_July_August_2009-1.jpg',
  圆形: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d2/Round_Objects.jpg/960px-Round_Objects.jpg',
  正方形: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/31/Food_on_a_square_plate_%28109515085%29.jpg/960px-Food_on_a_square_plate_%28109515085%29.jpg',
  三角形: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/34/Bournemouth%2C_a_triangle_sign_and_a_%27Triangle%27_sign_-_geograph.org.uk_-_1703799.jpg/330px-Bournemouth%2C_a_triangle_sign_and_a_%27Triangle%27_sign_-_geograph.org.uk_-_1703799.jpg',
  长方形: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/76/DoNotDisturbSign.jpg/960px-DoNotDisturbSign.jpg',
  星形: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0b/Reef_starfish_%28Stichaster_australis%29_doing_push-ups.jpg/960px-Reef_starfish_%28Stichaster_australis%29_doing_push-ups.jpg',
  心形: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0b/Heart_shaped_cookies.jpg/960px-Heart_shaped_cookies.jpg',
  椭圆形: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fb/Chicken_Egg_without_Eggshell_5859.jpg/960px-Chicken_Egg_without_Eggshell_5859.jpg',
  菱形: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/39/One_Sky_One_World_-_Kite_Flying_India_-_Royal_Kite_Flyers_Club.JPG/960px-One_Sky_One_World_-_Kite_Flying_India_-_Royal_Kite_Flyers_Club.JPG',
  杯子: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/da/Cup_and_Saucer_LACMA_47.35.6a-b_%281_of_3%29.jpg/960px-Cup_and_Saucer_LACMA_47.35.6a-b_%281_of_3%29.jpg',
  牙刷: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c3/Toothbrush_20050716_004.jpg/960px-Toothbrush_20050716_004.jpg',
  书包: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d7/Rucksack1.jpg/960px-Rucksack1.jpg',
  台灯: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d3/Wide_array_of_lamps.jpg/960px-Wide_array_of_lamps.jpg',
  雨伞: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/M0354_000727-005_1.jpg/960px-M0354_000727-005_1.jpg',
  闹钟: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8b/2010-07-20_Black_windup_alarm_clock_face.jpg/960px-2010-07-20_Black_windup_alarm_clock_face.jpg',
  足球: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1d/Football_Pallo_valmiina-cropped.jpg/250px-Football_Pallo_valmiina-cropped.jpg',
  积木: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/22/Toyblocks.JPG/330px-Toyblocks.JPG',
  爸爸: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/85/Father%27s_love_%28cropped%29.jpg/960px-Father%27s_love_%28cropped%29.jpg',
  妈妈: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/19/Portrait_of_a_woman_holding_a_baby_%28I0024828%29.jpg/960px-Portrait_of_a_woman_holding_a_baby_%28I0024828%29.jpg',
  哥哥: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a1/Jackson_5_1969.jpg/960px-Jackson_5_1969.jpg',
  姐姐: 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/98/Little_Julia_tending_the_baby_at_home.jpg/960px-Little_Julia_tending_the_baby_at_home.jpg',
  弟弟: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d8/Smiling_little_boy_of_Laos.jpg/960px-Smiling_little_boy_of_Laos.jpg',
  妹妹: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c0/Young_girl_smiling_in_sunshine_%282%29.jpg/960px-Young_girl_smiling_in_sunshine_%282%29.jpg',
  爷爷: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f8/Grandfather_and_child.jpg/960px-Grandfather_and_child.jpg',
  奶奶: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/80/Grandmother_with_Child_%285451976966%29.jpg/960px-Grandmother_with_Child_%285451976966%29.jpg',
  太阳: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/83/The_Sun_in_white_light.jpg/960px-The_Sun_in_white_light.jpg',
  月亮: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e1/FullMoon2010.jpg/960px-FullMoon2010.jpg',
  云朵: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1d/ISS-40_Thunderheads_near_Borneo.jpg/960px-ISS-40_Thunderheads_near_Borneo.jpg',
  雨天: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/65/Hard_rain_on_a_roof.jpg/960px-Hard_rain_on_a_roof.jpg',
  雪花: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e1/Snowflake_%28lumehelves%29.jpg/960px-Snowflake_%28lumehelves%29.jpg',
  彩虹: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5c/Double-alaskan-rainbow.jpg/960px-Double-alaskan-rainbow.jpg',
  星星: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f0/Night_Sky_Stars_Trees_02.jpg/960px-Night_Sky_Stars_Trees_02.jpg',
  大树: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7f/Usamljeni_jasen_-_panoramio_%28cropped%29.jpg/960px-Usamljeni_jasen_-_panoramio_%28cropped%29.jpg',
  米饭: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d6/Meshi_001.jpg/960px-Meshi_001.jpg',
  面包: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c7/Korb_mit_Br%C3%B6tchen.JPG/960px-Korb_mit_Br%C3%B6tchen.JPG',
  鸡蛋: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/54/Adolphe_Millot_oeufs-fixed.jpg/960px-Adolphe_Millot_oeufs-fixed.jpg',
  牛奶: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/Glass_of_Milk_%2833657535532%29.jpg/960px-Glass_of_Milk_%2833657535532%29.jpg',
  面条: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b5/Dalian_Liaoning_China_Noodlemaker-01.jpg/960px-Dalian_Liaoning_China_Noodlemaker-01.jpg',
  饼干: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b4/Bourbon_and_Custard_Cream.jpeg/960px-Bourbon_and_Custard_Cream.jpeg',
  蛋糕: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/04/Pound_layer_cake.jpg/500px-Pound_layer_cake.jpg',
  汤圆: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/34/Pumpkin_tangyuan_%28%E6%B1%A4%E5%9C%86%29_with_red_bean_baste_and_black_sesame_fillings.jpg/500px-Pumpkin_tangyuan_%28%E6%B1%A4%E5%9C%86%29_with_red_bean_baste_and_black_sesame_fillings.jpg',
}

function isLegacyPlaceholderUrl(url = '') {
  return /placehold\.co/i.test(url)
}

function resolveCardImageUrl(name = '', url = '') {
  const normalizedName = String(name).trim()

  if (url && !isLegacyPlaceholderUrl(url)) {
    return url
  }

  return REAL_CARD_IMAGE_MAP[normalizedName] || url || ''
}

function buildCardImageFields(name = '') {
  const image = resolveCardImageUrl(name)

  return {
    image,
    images: [],
  }
}

function normalizeCardRecord(card) {
  if (!card) {
    return card
  }

  const image = resolveCardImageUrl(card.name, card.image)
  const currentImages = Array.isArray(card.images) ? card.images : []
  const images = Array.from(
    new Set(
      currentImages
        .filter((item) => item && !isLegacyPlaceholderUrl(item))
        .filter((item) => item !== image),
    ),
  )

  return {
    ...card,
    image,
    images,
  }
}

function getCardImageUpdate(card) {
  const normalized = normalizeCardRecord(card)

  if (!normalized) {
    return null
  }

  const currentImages = Array.isArray(card.images) ? card.images : []
  const nextImages = Array.isArray(normalized.images) ? normalized.images : []
  const hasImageChanged = normalized.image !== (card.image || '')
  const hasImagesChanged = JSON.stringify(nextImages) !== JSON.stringify(currentImages)

  if (!hasImageChanged && !hasImagesChanged) {
    return null
  }

  return {
    image: normalized.image,
    images: nextImages,
    update_time: Date.now(),
  }
}

module.exports = {
  buildCardImageFields,
  getCardImageUpdate,
  isLegacyPlaceholderUrl,
  normalizeCardRecord,
  REAL_CARD_IMAGE_MAP,
  resolveCardImageUrl,
}
