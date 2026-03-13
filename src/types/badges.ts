export interface FriendBadge {
  id: string;
  giverId: string;
  receiverId: string;
  iconName: string;
  message: string;
  isFeatured: boolean;
  isHidden: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FriendBadgeWithGiver extends FriendBadge {
  giverFirstName: string;
  giverPhotoUrl?: string;
}

export interface AwardBadgeInput {
  receiverId: string;
  iconName: string;
  message: string;
}

export interface UpdateBadgeInput {
  iconName?: string;
  message?: string;
}
