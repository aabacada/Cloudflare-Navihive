import React, { useState, useEffect, useRef } from 'react';
import { GroupWithSites } from '../types';
import {
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Typography,
  Paper,
  useTheme,
  useMediaQuery,
  Tooltip,
} from '@mui/material';

interface GroupNavigationProps {
  groups: GroupWithSites[];
  isPinned?: boolean;
  onPinChange?: (pinned: boolean) => void;
  onGroupClick?: (groupId: number) => void;
}

const GroupNavigation: React.FC<GroupNavigationProps> = ({ groups, isPinned, onPinChange, onGroupClick }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [isSticky, setIsSticky] = useState(false);
  const [navPosition, setNavPosition] = useState({ top: 0, left: 0, height: 0 });
  const [tooltipOpen, setTooltipOpen] = useState<{[key: string]: boolean}>({}); // 控制每个分组的Tooltip状态
  const navRef = useRef<HTMLDivElement>(null);
  const firstGroupRef = useRef<HTMLDivElement>(null);
  const observerRefs = useRef<{ [key: string]: IntersectionObserver | null }>({});

  // 计算导航条初始位置
  useEffect(() => {
    const updateNavPosition = () => {
      if (firstGroupRef.current && navRef.current) {
        const firstGroupRect = firstGroupRef.current.getBoundingClientRect();
        const navRect = navRef.current.getBoundingClientRect();
        
        // 设置导航条初始位置与第一个分组对齐
        setNavPosition({
          top: firstGroupRect.top,
          left: navRect.left, // 记录导航条的原始左侧位置
          height: navRect.height
        });
      }
    };

    // 初始设置
    setTimeout(updateNavPosition, 100); // 延迟确保DOM已渲染
    
    // 窗口大小变化时重新计算
    window.addEventListener('resize', updateNavPosition);
    
    return () => {
      window.removeEventListener('resize', updateNavPosition);
    };
  }, [groups]);

  // 监听滚动事件，实现吸附效果
  useEffect(() => {
    const handleScroll = () => {
      if (!navRef.current) return;
      
      const scrollY = window.scrollY;
      
      // 动态获取第一个分组的位置，而不是使用初始计算的navPosition.top
      const firstGroupElement = document.getElementById('first-group-marker');
      const firstGroupTop = firstGroupElement ? firstGroupElement.getBoundingClientRect().top + window.scrollY : navPosition.top;
      
      // 当滚动超过第一个分组位置时，设置为固定定位
      if (scrollY > firstGroupTop) {
        setIsSticky(true);
        // 通知父组件导航条已固定
        if (onPinChange && !isPinned) {
          onPinChange(true);
        }
      } else {
        setIsSticky(false);
        // 通知父组件导航条已取消固定
        if (onPinChange && isPinned) {
          onPinChange(false);
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [navPosition, onPinChange, isPinned]);

  // 设置IntersectionObserver来监听每个分组区域
  useEffect(() => {
    // 清理之前的观察者
    Object.values(observerRefs.current).forEach(observer => {
      if (observer) observer.disconnect();
    });
    observerRefs.current = {};

    // 为每个分组创建观察者
    groups.forEach(group => {
      const element = document.getElementById(`group-${group.id}`);
      if (element) {
        const observer = new IntersectionObserver(
          (entries) => {
            entries.forEach(entry => {
              if (entry.isIntersecting) {
                setActiveGroupId(`group-${group.id}`);
              }
            });
          },
          {
            rootMargin: '-20% 0px -70% 0px', // 当分组进入视图20%时触发
          }
        );
        
        observer.observe(element);
        observerRefs.current[`group-${group.id}`] = observer;
      }
    });

    return () => {
      Object.values(observerRefs.current).forEach(observer => {
        if (observer) observer.disconnect();
      });
    };
  }, [groups]);

  // 处理导航项点击
  const handleNavClick = (groupId: string) => {
    // 点击后立即关闭该分组的Tooltip
    setTooltipOpen(prev => ({
      ...prev,
      [groupId]: false
    }));
    
    const element = document.getElementById(groupId);
    if (element) {
      const offset = isSticky ? navPosition.height + 20 : 20;
      const elementPosition = element.getBoundingClientRect().top + window.scrollY;
      const offsetPosition = elementPosition - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
    
    if (onGroupClick) {
      const groupIdNumber = parseInt(groupId.replace('group-', ''));
      onGroupClick(groupIdNumber);
    }
  };

  // 处理鼠标进入分组
  const handleMouseEnter = (groupId: string) => {
    setTooltipOpen(prev => ({
      ...prev,
      [groupId]: true
    }));
  };

  // 处理鼠标离开分组
  const handleMouseLeave = (groupId: string) => {
    setTooltipOpen(prev => ({
      ...prev,
      [groupId]: false
    }));
  };

  // 如果没有分组，不渲染导航条
  if (groups.length === 0) {
    return null;
  }

  return (
    <>
      {/* 第一个分组的引用元素，用于计算初始位置 */}
      {groups.length > 0 && (
        <div
          ref={firstGroupRef}
          id="first-group-marker"
          style={{ position: 'absolute', visibility: 'hidden' }}
        />
      )}
      
      {/* 导航条容器 */}
      <Box
        ref={navRef}
        sx={{
          width: isMobile ? '100%' : 120, // 从110调整为120
          flexShrink: 0,
          position: isSticky ? 'fixed' : 'relative',
          top: isSticky ? 0 : 'auto', // 固定时显示在页面顶部
          left: isSticky ? (isMobile ? 0 : navPosition.left) : 0, // 默认状态下确保左侧对齐
          zIndex: isSticky ? 1100 : 1,
          transition: 'top 0.3s ease, margin 0.3s ease, box-shadow 0.3s ease', // 只对top、margin和box-shadow应用过渡，不包括left
          mt: isSticky ? 0 : 1,
          mb: isSticky ? 0 : 2,
          // 确保导航条在默认状态下也能完整显示
          ml: isSticky ? 0 : 'auto', // 非固定状态下自动左边距
          mr: isSticky ? 0 : 'auto', // 非固定状态下自动右边距
        }}
      >
        <Paper
          elevation={isSticky ? 3 : 1}
          sx={{
            borderRadius: 3,
            overflow: 'hidden',
            backgroundColor: theme.palette.mode === 'dark' 
              ? 'rgba(33, 33, 33, 0.95)' 
              : 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(10px)',
            border: `1px solid ${theme.palette.divider}`,
            // 移除最大高度和滚动设置，让所有分组名称都能完整显示
          }}
        >
          <Box sx={{ p: 2, borderBottom: `1px solid ${theme.palette.divider}` }}>
            <Typography variant="h6" component="div" fontWeight="600">
              分组导航
            </Typography>
          </Box>
          <List dense sx={{ p: 1 }}>
            {groups.map((group) => (
              <ListItem key={group.id} disablePadding sx={{ mb: 0.5 }}>
                <ListItemButton
                  onClick={() => handleNavClick(`group-${group.id}`)}
                  onMouseEnter={() => handleMouseEnter(`group-${group.id}`)}
                  onMouseLeave={() => handleMouseLeave(`group-${group.id}`)}
                  selected={activeGroupId === `group-${group.id}`}
                  sx={{
                    borderRadius: 2,
                    py: 1,
                    px: 2,
                    '&.Mui-selected': {
                      backgroundColor: theme.palette.primary.main + '20',
                      color: theme.palette.primary.main,
                      '&:hover': {
                        backgroundColor: theme.palette.primary.main + '30',
                      },
                    },
                  }}
                >
                  {/* 为超过4个字符的分组名称添加Tooltip */}
                  {group.name.length > 4 ? (
                    <Tooltip 
                      title={group.name} 
                      placement="right" 
                      arrow
                      open={tooltipOpen[`group-${group.id}`] || false}
                      onClose={() => handleMouseLeave(`group-${group.id}`)}
                    >
                      <ListItemText
                        primary={group.name}
                        primaryTypographyProps={{
                          variant: 'body2',
                          fontWeight: 'medium',
                          noWrap: true,
                        }}
                      />
                    </Tooltip>
                  ) : (
                    <ListItemText
                      primary={group.name}
                      primaryTypographyProps={{
                        variant: 'body2',
                        fontWeight: 'medium',
                        noWrap: true,
                      }}
                    />
                  )}
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Paper>
      </Box>
    </>
  );
};

export default GroupNavigation;