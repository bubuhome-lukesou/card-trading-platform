export declare enum PageType {
    HELP = "help",
    CONTACT = "contact",
    FAQ = "faq"
}
export declare class Page {
    id: number;
    type: string;
    titleZh: string;
    titleEn: string;
    contentZh: string;
    contentEn: string;
    createdAt: Date;
    updatedAt: Date;
}
