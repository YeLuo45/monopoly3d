# PRJ-20260418-001 monopoly3d — 在线多人模式 PRD

## 项目背景
monopoly3d 是 3D 地产大亨 Web 游戏（Three.js + React）。

---

## 功能需求

### D. 在线多人模式

#### 1. Supabase 项目配置
- 使用 Supabase 实时订阅（Realtime）进行状态同步
- 数据库表：rooms, players, game_states
- 匿名登录（anonymous auth）让玩家无需注册即可加入房间

#### 2. 数据库设计

**rooms 表**
```sql
id: uuid PRIMARY KEY
code: varchar(6) UNIQUE  -- 房间码，如 "ABC123"
host_id: varchar(50)     -- 房主 player_id
status: 'waiting' | 'playing' | 'finished'
max_players: integer DEFAULT 6
current_turn: integer DEFAULT 0  -- 当前轮到第几个玩家
settings: jsonb           -- 地图配置、初始资金等
created_at: timestamp
```

**players 表**
```sql
id: uuid PRIMARY KEY
room_id: uuid REFERENCES rooms
player_id: varchar(50)   -- 浏览器生成匿名 ID
name: varchar(20)
position: integer DEFAULT 0
money: integer DEFAULT 1500
properties: integer[]    -- 拥有的地产 tileIndex 数组
is_ready: boolean DEFAULT false
is_online: boolean DEFAULT true
color: varchar(10)        -- 玩家颜色
order_index: integer      -- 座位顺序
```

**game_events 表（用于事件溯源）**
```sql
id: uuid PRIMARY KEY
room_id: uuid REFERENCES rooms
player_id: varchar(50)
event_type: 'roll_dice' | 'buy_property' | 'pay_toll' | 'build_house' | 'answer_question'
payload: jsonb
turn_index: integer
created_at: timestamp
```

#### 3. 房间系统

**创建房间**
- 房主点击"创建房间" → 生成 6 位房间码
- 写入 rooms 表，host_id 为自己
- 房主可设置：地图（默认/自定义）、初始资金、最大玩家数

**加入房间**
- 玩家输入 6 位房间码 → 查询 rooms 表
- 验证房间存在且状态为 waiting
- 写入 players 表，获取座位顺序
- 通过 Realtime subscription 订阅该房间

**房间列表**
- 显示当前可加入的房间（status=waiting）
- 实时更新（有人加入/开始游戏/房间关闭）

#### 4. 实时同步方案

**方案：轮询 + 行级锁**

由于骰子游戏需要严格的回合顺序，采用 **Turn-based 轮询** 而非纯 WebSocket：

- 轮询间隔：1 秒（使用 Supabase Realtime）
- 每位玩家操作后更新 `game_events` 表
- 所有客户端订阅 `game_events` 变化
- 当前玩家需等待上一位玩家操作完成才能操作
- 超时处理：30 秒无操作自动跳过回合

**操作流程示例（玩家1 掷骰子）：**
1. 前端：检测到是当前玩家，按钮可用
2. 玩家1：点击"掷骰"按钮
3. 客户端：写入 game_events（roll_dice，payload: {dice1, dice2}）
4. 服务端：trigger 自动更新 players.position
5. 所有客户端：监听到 game_events 变化，重新渲染棋盘
6. 玩家2：按钮变为可用状态

#### 5. 游戏主流程同步

**初始同步**
- 房主开始游戏 → rooms.status = 'playing'
- 所有客户端监听 rooms 变化，进入游戏状态
- 下载当前 players 列表和 game_events 历史

**回合同步**
- 每个玩家操作作为一条 game_events 记录
- 客户端根据事件历史重建完整游戏状态
- 本地乐观更新 + 服务端最终状态校验

**断线重连**
- players.is_online = false
- 房主可踢出离线玩家
- 离线玩家重新加入 → 恢复之前的 room_id 和 player_id

#### 6. 房间内 UI

**等待大厅**
```
+------------------------------------------+
|  房间 ABC123  房主：张三                   |
+------------------------------------------+
|  [玩家1] 你 - 已准备 ✓    |  [准备]        |
|  [玩家2] 李四 - 已准备 ✓  |  [准备]        |
|  [空位]   等待加入...    |                |
+------------------------------------------+
|  [设置] 地图: 默认 | 初始资金: $1500       |
+------------------------------------------+
|  [开始游戏] (仅房主可见，所有人准备好后可用)  |
|  [退出房间]                              |
+------------------------------------------+
```

**游戏中 HUD**
- 右上角：当前玩家列表（高亮当前回合玩家）
- 自己的状态：资金、地产数量
- 操作区：骰子按钮（仅当前玩家可用）

#### 7. 聊天功能
- 每局游戏内实时聊天
- 使用 Supabase Realtime channel `room_{id}_chat`
- 消息表 chat_messages：
  ```sql
  id, room_id, player_id, player_name, message, created_at
  ```
- 聊天面板显示在游戏界面右侧（可折叠）

#### 8. 多人游戏入口
- 主菜单新增"🌐 在线对战"按钮
- 按钮下有两个选项：
  - "创建房间" → 创建房间流程
  - "加入房间" → 输入房间码 + 昵称

#### 9. 房主特权
- 开始游戏（所有玩家 ready 后）
- 踢出玩家
- 修改房间设置（仅 waiting 状态）
- 解散房间

---

## 技术方案

- **Supabase JS SDK**：v2
- **认证**：匿名登录（supabase.auth.signInAnonymously）
- **实时订阅**：supabase.channel + on('postgres_changes')
- **房间码**：前端生成 6 位字母，查询时索引

---

## 验收标准

1. ✅ 可创建房间并获得 6 位房间码
2. ✅ 可通过房间码加入他人房间
3. ✅ 房间内显示所有玩家列表和准备状态
4. ✅ 房主可开始游戏（所有玩家 ready）
5. ✅ 玩家轮流掷骰，状态同步到所有客户端
6. ✅ 玩家购买地产/升级操作实时同步
7. ✅ 断线重连后恢复游戏状态
8. ✅ 房主可踢出离线玩家
9. ✅ 游戏内聊天功能可用
10. ✅ 支持 2-6 人游戏

---

## 已知限制 / 后续扩展
- 地图编辑器自定义地图同步（后续 H. 的地图可共享）
- 观战模式（其他人可旁观）
- AI 玩家填充空位
