import React, { useState, useEffect } from 'react';

function TimerComponent() {
  const [elapsedTime, setElapsedTime] = useState(0);
  let intervalId;

  useEffect(() => {
    // 开始计时
    intervalId = setInterval(() => {
      setElapsedTime((prevTime) => prevTime + 10); // 每10毫秒增加一次时间
    }, 10);

    // 清理定时器，防止内存泄漏
    return () => clearInterval(intervalId);
  }, []);

  // 将毫秒转换为更易读的格式：小时、分钟、秒、毫秒
  const formatTime = (ms) => {
    const date = new Date(ms);
    return date.getUTCHours() + ':'
      + ('0' + date.getUTCMinutes()).slice(-2) + ':'
      + ('0' + date.getUTCSeconds()).slice(-2) + '.'
      + ('00' + Math.floor(date.getUTCMilliseconds())).slice(-3);
  };

  return (
    <div style={{width:'100%',marginTop:20,textAlign:'center'}} >
      <p>Elapsed Time : {formatTime(elapsedTime)}</p>
    </div>
  );
}

export default TimerComponent;
