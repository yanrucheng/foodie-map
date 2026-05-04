/** Cuisine group visual configuration. Maps group label to marker/legend colors. */
export interface CuisineGroupStyle {
  color: string;
  text: string;
}

export type CuisineGroupMap = Record<string, CuisineGroupStyle>;

/** All cuisine groups with their visual styling, extracted from the original map. */
export const cuisineGroups: CuisineGroupMap = {
  "粤菜 / 烧腊 / 港式小馆": { color: "#D64C4C", text: "#fff" },
  "面食 / 云吞 / 车仔面": { color: "#E1B93A", text: "#1a1a1a" },
  "点心 / 茶楼": { color: "#43A36B", text: "#fff" },
  "潮州 / 客家 / 顺德": { color: "#8A57C9", text: "#fff" },
  "京沪 / 上海 / 川菜": { color: "#E0823F", text: "#fff" },
  "东南亚 / 印度 / 泰 / 越": { color: "#4386D6", text: "#fff" },
  "日料 / 韩餐": { color: "#2B2B2B", text: "#fff" },
  "西餐 / 其他": { color: "#8C8F96", text: "#fff" },
};
