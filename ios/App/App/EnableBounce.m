//
//  EnableBounce.m
//  App
//
//  Created by Ankit Kumar Karna on 24/01/2023.
//

#import <Foundation/Foundation.h>
#import <UIKit/UIKit.h>

@implementation UIScrollView (NoBounce)
- (void)didMoveToWindow {
   [super didMoveToWindow];
   self.bounces = YES;
}
@end
