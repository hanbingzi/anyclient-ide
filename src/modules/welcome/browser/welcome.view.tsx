import * as React from 'react';
import { Button } from '@opensumi/ide-components';
import * as styles from './welcome.module.less';

export const WelcomeView = () => {
  return (
    <div className={styles.components_wrap}>
      <h1 className={styles.title}>IMessageService: Show Message</h1>
      <Button style={{ marginRight: 10 }} onClick={() => {console.log('test->')}}>
        Show Info Message
      </Button>
      <h1 className={styles.title}>IDialogSerice: Show Dialog</h1>
      <Button>Show Dialog</Button>
      <h1 className={styles.title}>IProgressService: Show Progress</h1>
      <Button>Show Progress</Button>
    </div>
  );
};
