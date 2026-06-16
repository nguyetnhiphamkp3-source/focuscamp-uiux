export type Locale = "vi" | "en";

export const DICT = {
  vi: {
    // ── Navigation sections ───────────────────────────────────────────
    sectionCommunity: "Cộng đồng",
    sectionLearning: "Học tập",
    sectionOther: "Khác",
    sectionDiscover: "Khám phá",
    sectionAbout: "Về chúng tôi",
    sectionAdmin: "Admin",
    // ── Nav items ────────────────────────────────────────────────────
    navFeed: "Bảng tin",
    navCot: "CỐT",
    navSignals: "Tín hiệu",
    navQa: "Hỏi đáp",
    navCourses: "Khóa học",
    navChallenges: "Challenge",
    navEvents: "Sự kiện",
    navLeaderboard: "Bảng xếp hạng",
    navMarketplace: "Marketplace",
    navAgent: "AI Agent",
    navAffiliate: "Affiliate",
    navMembers: "Thành viên",
    navReports: "Báo cáo",
    navOrders: "Đơn hàng",
    navSettings: "Cài đặt",
    navDiscovery: "Discovery",
    navSearch: "Tìm kiếm",
    navSuperMarketplace: "Super Marketplace",
    navManifesto: "Manifesto",
    navDirectChallenge: "Direct Challenge",
    navBrandGuide: "Brand Guide",
    navFireKeeper: "Fire Keeper",
    navPlatformOrders: "Đơn hàng nền tảng",
    // ── User panel ───────────────────────────────────────────────────
    guest: "Khách",
    online: "Online",
    needLogin: "Cần đăng nhập",
    loginCta: "Đăng nhập để trải nghiệm",
    openProfile: "Mở profile",
    // ── User menu ────────────────────────────────────────────────────
    changeWallpaper: "Đổi hình nền",
    messages: "Tin nhắn",
    logout: "Đăng xuất",
    language: "English",
    // ── Notifications ────────────────────────────────────────────────
    notifInbox: "Thông báo",
    notifRead: "Đã đọc",
    // ── Leaderboard ──────────────────────────────────────────────────
    lbTitle: "Bảng xếp hạng",
    lbTopMembers: "Thành viên nổi bật",
    lbAllTime: "Toàn thời gian",
    lbMonth: "Tháng này",
    lbWeek: "Tuần này",
    lbMember: "Thành viên",
    lbNoXp: "Chưa có thành viên nào có XP",
    lbNoPeriod: "Chưa có hoạt động trong khoảng này",
    // ── Community ────────────────────────────────────────────────────
    joinToUnlock: "🔒 Tham gia để mở khoá",
    communityNotReady: "Cộng đồng này chưa sẵn sàng",
    communityNotReadyDesc: "Cộng đồng đang trong quá trình thiết lập. Hãy khám phá các cộng đồng khác đang hoạt động.",
    exploreOther: "Khám phá cộng đồng khác",
    memberRole: "Thành viên",
    // ── Right sidebar ─────────────────────────────────────────────────
    rsWhatYouGet: "Bạn sẽ nhận được",
    rsProgress: "Tiến độ của bạn",
    rsRole: "Vai trò",
    rsFeatures: [
      ["📚", "Lộ trình học tập có cấu trúc"],
      ["⚔️", "Challenge thực chiến mỗi tuần"],
      ["🛒", "Deals & tools độc quyền"],
      ["👥", "Mentorship & kết nối cộng đồng"],
      ["🏆", "Thành tích & phần thưởng"],
    ] as [string, string][],
    // ── Feed / Posts ─────────────────────────────────────────────────
    share: "Chia sẻ",
    copied: "Đã copy",
    bookmark: "Lưu lại",
    bookmarked: "Đã lưu",
    // ── Marketplace ──────────────────────────────────────────────────
    mkAll: "Tất cả",
    mkTemplate: "Tài liệu",
    mkSop: "Quy trình",
    mkTool: "Công cụ",
    mkPrompt: "Prompt",
    mkBundle: "Combo",
    mkFree: "Miễn phí",
    mkSearchPlaceholder: "Tìm kiếm sản phẩm, challenge…",
    // ── Course ───────────────────────────────────────────────────────
    coursePublished: "Đã phát hành",
    courseDraft: "Nháp",
    // ── Common ───────────────────────────────────────────────────────
    comingSoon: "Sắp ra mắt",
    chatUser: "Người dùng",
    // ── Challenge ────────────────────────────────────────────────────
    evidenceText: "Văn bản",
    evidenceImage: "Hình ảnh",
    evidenceTextImage: "Văn bản + Hình ảnh",
    evidenceLink: "Link",
    // ── Stats (home page) ────────────────────────────────────────────
    statCommunities: "Cộng đồng",
    statMembers: "Thành viên",
    statChallenges: "Challenges",
    statProducts: "Sản phẩm",
  },
  en: {
    // ── Navigation sections ───────────────────────────────────────────
    sectionCommunity: "Community",
    sectionLearning: "Learning",
    sectionOther: "More",
    sectionDiscover: "Discover",
    sectionAbout: "About Us",
    sectionAdmin: "Admin",
    // ── Nav items ────────────────────────────────────────────────────
    navFeed: "Feed",
    navCot: "CỐT",
    navSignals: "Signals",
    navQa: "Q&A",
    navCourses: "Courses",
    navChallenges: "Challenges",
    navEvents: "Events",
    navLeaderboard: "Leaderboard",
    navMarketplace: "Marketplace",
    navAgent: "AI Agent",
    navAffiliate: "Affiliate",
    navMembers: "Members",
    navReports: "Reports",
    navOrders: "Orders",
    navSettings: "Settings",
    navDiscovery: "Discovery",
    navSearch: "Search",
    navSuperMarketplace: "Super Marketplace",
    navManifesto: "Manifesto",
    navDirectChallenge: "Direct Challenge",
    navBrandGuide: "Brand Guide",
    navFireKeeper: "Fire Keeper",
    navPlatformOrders: "Platform Orders",
    // ── User panel ───────────────────────────────────────────────────
    guest: "Guest",
    online: "Online",
    needLogin: "Please sign in",
    loginCta: "Sign in to get started",
    openProfile: "Open profile",
    // ── User menu ────────────────────────────────────────────────────
    changeWallpaper: "Change wallpaper",
    messages: "Messages",
    logout: "Sign out",
    language: "Tiếng Việt",
    // ── Notifications ────────────────────────────────────────────────
    notifInbox: "Inbox",
    notifRead: "Read",
    // ── Leaderboard ──────────────────────────────────────────────────
    lbTitle: "Leaderboard",
    lbTopMembers: "Top members",
    lbAllTime: "All-time",
    lbMonth: "This month",
    lbWeek: "This week",
    lbMember: "Member",
    lbNoXp: "No members have XP yet",
    lbNoPeriod: "No activity in this period",
    // ── Community ────────────────────────────────────────────────────
    joinToUnlock: "🔒 Join to unlock",
    communityNotReady: "This community isn't ready yet",
    communityNotReadyDesc: "The community is being set up. Explore other active communities.",
    exploreOther: "Explore communities",
    memberRole: "Member",
    // ── Right sidebar ─────────────────────────────────────────────────
    rsWhatYouGet: "What you'll get",
    rsProgress: "Your progress",
    rsRole: "Role",
    rsFeatures: [
      ["📚", "Structured learning paths"],
      ["⚔️", "Weekly build challenges"],
      ["🛒", "Exclusive deals & tools"],
      ["👥", "Mentorship & networking"],
      ["🏆", "Achievements & rewards"],
    ] as [string, string][],
    // ── Feed / Posts ─────────────────────────────────────────────────
    share: "Share",
    copied: "Copied",
    bookmark: "Bookmark",
    bookmarked: "Saved",
    // ── Marketplace ──────────────────────────────────────────────────
    mkAll: "All",
    mkTemplate: "Template",
    mkSop: "SOP",
    mkTool: "Tool",
    mkPrompt: "Prompt",
    mkBundle: "Bundle",
    mkFree: "Free",
    mkSearchPlaceholder: "Search products, challenges…",
    // ── Course ───────────────────────────────────────────────────────
    coursePublished: "Published",
    courseDraft: "Draft",
    // ── Common ───────────────────────────────────────────────────────
    comingSoon: "Coming soon",
    chatUser: "User",
    // ── Challenge ────────────────────────────────────────────────────
    evidenceText: "Text",
    evidenceImage: "Image",
    evidenceTextImage: "Text + Image",
    evidenceLink: "Link",
    // ── Stats (home page) ────────────────────────────────────────────
    statCommunities: "Communities",
    statMembers: "Members",
    statChallenges: "Challenges",
    statProducts: "Products",
  },
} as const;

export type TranslationKey = keyof typeof DICT.vi;

export function tSync(key: TranslationKey, locale: Locale): string {
  const val = DICT[locale][key];
  if (Array.isArray(val)) return String(val);
  return val as string;
}

