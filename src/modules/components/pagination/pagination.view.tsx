import { PaginationProps } from './pagination.types';
import React, { useCallback, useEffect, useMemo } from 'react';
import cls from 'classnames';
import styles from './pagination.module.less';
import { AiOutlineLeft, AiOutlineRight } from 'react-icons/ai';
import { Pager } from './pager';
import { VscEllipsis } from 'react-icons/vsc';

export const Pagination = (props: PaginationProps) => {
  const {
    page = 1,
    total = 0,
    pageSize = 50,
    pageCount = 0,
    pageSizeOptions = [50, 100, 200, 300, 500, 1000],
    showLessItems = false,
    onChange,
  } = props;
  const pageSizeSelectRef = React.useRef<HTMLSelectElement>(null);
  // 总共多少页
  const allPages = useMemo(() => Math.floor((total - 1) / pageSize) + 1, [total, pageSize]);

  useEffect(() => {
    if (onChange && allPages !== 0 && page > allPages) {
      onChange(allPages, pageSize);
    }
  }, [allPages, pageSize]);
  //该函数保证翻到超页,会跳转到最后一页，
  // if (onChange && allPages !== 0 && page > allPages) {
  //   onChange(allPages-1, pageSize);
  // }
  const jumpPrevPage = useCallback(() => {
    if (page > 1) {
      handleChange(page - 1);
    }
  }, [page, pageSize]);

  const jumpNextPage = useCallback(() => {
    if (page < allPages) {
      handleChange(page + 1);
    }
  }, [page, allPages, pageSize]);

  const handlePage = useCallback(
    (page: number) => {
      handleChange(page);
    },
    [page, pageSize],
  );

  const handlePageSize = useCallback(() => {
    let pageSize = pageSizeSelectRef.current?.value;
    if (pageSize) {
      handleChange(page, Number(pageSize)); // 转换方式，重点记住
    }
  }, [page]);

  const handleChange = useCallback(
    (page: number, newPageSize = pageSize) => {
      if (onChange) {
        onChange(page, newPageSize);
      }
    },
    [page, total, pageSize, pageCount],
  );

  const renderPrev = useCallback(() => {
    let disabled = false;
    if (page === 1) {
      disabled = true;
    }
    return (
      <div
        className={cls(
          styles['opt-item'],
          styles['opt-item-btn'],
          disabled ? styles['opt-item-disabled'] : styles['opt-item-active'],
        )}
        onClick={jumpPrevPage}
      >
        <AiOutlineLeft />
      </div>
    );
  }, [page, allPages]);

  const renderNext = useCallback(() => {
    let disabled = false;
    if (page === allPages) {
      disabled = true;
    }
    return (
      <div
        className={cls(
          styles['opt-item'],
          styles['opt-item-btn'],
          disabled ? styles['opt-item-disabled'] : styles['opt-item-active'],
        )}
        onClick={jumpNextPage}
      >
        <AiOutlineRight />
      </div>
    );
  }, [page, allPages]);

  // const renderStartEllipsis = () => {
  // }
  //
  // const renderEndEllipsis = () => {
  // }

  const renderPager = useCallback(() => {
    const pageBufferSize = showLessItems ? 1 : 2;
    let pagerList: any = [];
    if (allPages <= 3 + pageBufferSize * 2) {
      for (let i = 1; i <= allPages; i++) {
        pagerList.push(<Pager key={i} active={i === page} page={i} handlePager={handlePage} />);
      }
    } else {
      let left = Math.max(1, page - pageBufferSize);
      let right = Math.min(page + pageBufferSize, allPages);
      if (page - 1 <= pageBufferSize) {
        right = 1 + pageBufferSize * 2;
      }
      if (allPages - page <= pageBufferSize) {
        left = allPages - pageBufferSize * 2;
      }
      // console.log('left-->', left, ';right-->', right)
      if (left !== 1) {
        pagerList.push(<Pager key={1} active={false} page={1} handlePager={handlePage} />);
      }
      if (left > 2) {
        pagerList.push(
          <div key={'startEllipsis'} className={cls(styles['opt-item'], styles['opt-item-btn'])}>
            <VscEllipsis />
          </div>,
        );
      }

      for (let i = left; i <= right; i++) {
        pagerList.push(<Pager key={i} active={i === page} page={i} handlePager={handlePage} />);
      }
      if (right < allPages - 1) {
        pagerList.push(
          <div key={'endEllipsis'} className={cls(styles['opt-item'], styles['opt-item-btn'])}>
            <VscEllipsis />
          </div>,
        );
      }
      if (right !== allPages) {
        pagerList.push(<Pager key={allPages} active={false} page={allPages} handlePager={handlePage} />);
      }
    }
    return pagerList;
  }, [page, allPages]);

  const renderPageSize = useCallback(
    () => (
      <div className={cls(styles['opt-select-container'])}>
        <span>每页</span>
        <span>
          <select
            name={'pageSize'}
            className={cls(styles['opt-select'])}
            ref={pageSizeSelectRef}
            defaultValue={pageSize}
            onChange={handlePageSize}
          >
            {pageSizeOptions.map((count, index) => (
              <option key={index}>{count}</option>
            ))}
          </select>
          {/*<Select*/}
          {/*  showSearch={false}*/}
          {/*  style={{width: '64px'}}*/}
          {/*  value={pageSize}*/}
          {/*  onChange={handlePageSize}*/}
          {/*  options={pageSizeOptions}*/}
          {/*  size={"small"}*/}
          {/*  dropdownRenderType={"absolute"}*/}
          {/*/>*/}
        </span>
        <span>条</span>
      </div>
    ),
    [pageSizeOptions],
  );

  return (
    <div className={styles['pagination-container']}>
      <div className={styles['pagination-info-container']}>
        总共{total}条，共{allPages}页，本页{pageCount}条
      </div>

      <div className={styles['pagination-opt-container']}>
        {renderPrev()}
        {renderPager()}
        {renderNext()}
        {renderPageSize()}
      </div>
    </div>
  );
};
