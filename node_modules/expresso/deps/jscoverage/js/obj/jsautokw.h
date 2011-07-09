    /*
     * Generating switch for the list of 61 entries:
     * break
     * case
     * continue
     * default
     * delete
     * do
     * else
     * export
     * false
     * for
     * function
     * if
     * in
     * new
     * null
     * return
     * switch
     * this
     * true
     * typeof
     * var
     * void
     * while
     * with
     * const
     * try
     * catch
     * finally
     * throw
     * instanceof
     * abstract
     * boolean
     * byte
     * char
     * class
     * double
     * extends
     * final
     * float
     * goto
     * implements
     * import
     * int
     * interface
     * long
     * native
     * package
     * private
     * protected
     * public
     * short
     * static
     * super
     * synchronized
     * throws
     * transient
     * volatile
     * enum
     * debugger
     * yield
     * let
     */
    switch (JSKW_LENGTH()) {
      case 2:
        if (JSKW_AT(0) == 'd') {
            if (JSKW_AT(1)=='o') {
                JSKW_GOT_MATCH(5) /* do */
            }
            JSKW_NO_MATCH()
        }
        if (JSKW_AT(0) == 'i') {
            if (JSKW_AT(1) == 'f') {
                JSKW_GOT_MATCH(11) /* if */
            }
            if (JSKW_AT(1) == 'n') {
                JSKW_GOT_MATCH(12) /* in */
            }
            JSKW_NO_MATCH()
        }
        JSKW_NO_MATCH()
      case 3:
        switch (JSKW_AT(2)) {
          case 'r':
            if (JSKW_AT(0) == 'f') {
                if (JSKW_AT(1)=='o') {
                    JSKW_GOT_MATCH(9) /* for */
                }
                JSKW_NO_MATCH()
            }
            if (JSKW_AT(0) == 'v') {
                if (JSKW_AT(1)=='a') {
                    JSKW_GOT_MATCH(20) /* var */
                }
                JSKW_NO_MATCH()
            }
            JSKW_NO_MATCH()
          case 't':
            if (JSKW_AT(0) == 'i') {
                if (JSKW_AT(1)=='n') {
                    JSKW_GOT_MATCH(42) /* int */
                }
                JSKW_NO_MATCH()
            }
            if (JSKW_AT(0) == 'l') {
                if (JSKW_AT(1)=='e') {
                    JSKW_GOT_MATCH(60) /* let */
                }
                JSKW_NO_MATCH()
            }
            JSKW_NO_MATCH()
          case 'w':
            if (JSKW_AT(0)=='n' && JSKW_AT(1)=='e') {
                JSKW_GOT_MATCH(13) /* new */
            }
            JSKW_NO_MATCH()
          case 'y':
            if (JSKW_AT(0)=='t' && JSKW_AT(1)=='r') {
                JSKW_GOT_MATCH(25) /* try */
            }
            JSKW_NO_MATCH()
        }
        JSKW_NO_MATCH()
      case 4:
        switch (JSKW_AT(3)) {
          case 'd':
            if (JSKW_AT(0)=='v' && JSKW_AT(1)=='o' && JSKW_AT(2)=='i') {
                JSKW_GOT_MATCH(21) /* void */
            }
            JSKW_NO_MATCH()
          case 'e':
            if (JSKW_AT(2) == 's') {
                if (JSKW_AT(0) == 'c') {
                    if (JSKW_AT(1)=='a') {
                        JSKW_GOT_MATCH(1) /* case */
                    }
                    JSKW_NO_MATCH()
                }
                if (JSKW_AT(0) == 'e') {
                    if (JSKW_AT(1)=='l') {
                        JSKW_GOT_MATCH(6) /* else */
                    }
                    JSKW_NO_MATCH()
                }
                JSKW_NO_MATCH()
            }
            if (JSKW_AT(2) == 't') {
                if (JSKW_AT(0)=='b' && JSKW_AT(1)=='y') {
                    JSKW_GOT_MATCH(32) /* byte */
                }
                JSKW_NO_MATCH()
            }
            if (JSKW_AT(2) == 'u') {
                if (JSKW_AT(0)=='t' && JSKW_AT(1)=='r') {
                    JSKW_GOT_MATCH(18) /* true */
                }
                JSKW_NO_MATCH()
            }
            JSKW_NO_MATCH()
          case 'g':
            if (JSKW_AT(0)=='l' && JSKW_AT(1)=='o' && JSKW_AT(2)=='n') {
                JSKW_GOT_MATCH(44) /* long */
            }
            JSKW_NO_MATCH()
          case 'h':
            if (JSKW_AT(0)=='w' && JSKW_AT(1)=='i' && JSKW_AT(2)=='t') {
                JSKW_GOT_MATCH(23) /* with */
            }
            JSKW_NO_MATCH()
          case 'l':
            if (JSKW_AT(0)=='n' && JSKW_AT(1)=='u' && JSKW_AT(2)=='l') {
                JSKW_GOT_MATCH(14) /* null */
            }
            JSKW_NO_MATCH()
          case 'm':
            if (JSKW_AT(0)=='e' && JSKW_AT(1)=='n' && JSKW_AT(2)=='u') {
                JSKW_GOT_MATCH(57) /* enum */
            }
            JSKW_NO_MATCH()
          case 'o':
            if (JSKW_AT(0)=='g' && JSKW_AT(1)=='o' && JSKW_AT(2)=='t') {
                JSKW_GOT_MATCH(39) /* goto */
            }
            JSKW_NO_MATCH()
          case 'r':
            if (JSKW_AT(0)=='c' && JSKW_AT(1)=='h' && JSKW_AT(2)=='a') {
                JSKW_GOT_MATCH(33) /* char */
            }
            JSKW_NO_MATCH()
          case 's':
            if (JSKW_AT(0)=='t' && JSKW_AT(1)=='h' && JSKW_AT(2)=='i') {
                JSKW_GOT_MATCH(17) /* this */
            }
            JSKW_NO_MATCH()
        }
        JSKW_NO_MATCH()
      case 5:
        switch (JSKW_AT(3)) {
          case 'a':
            if (JSKW_AT(0) == 'b') {
                if (JSKW_AT(4)=='k' && JSKW_AT(1)=='r' && JSKW_AT(2)=='e') {
                    JSKW_GOT_MATCH(0) /* break */
                }
                JSKW_NO_MATCH()
            }
            if (JSKW_AT(0) == 'f') {
                if (JSKW_AT(4) == 'l') {
                    if (JSKW_AT(2)=='n' && JSKW_AT(1)=='i') {
                        JSKW_GOT_MATCH(37) /* final */
                    }
                    JSKW_NO_MATCH()
                }
                if (JSKW_AT(4) == 't') {
                    if (JSKW_AT(2)=='o' && JSKW_AT(1)=='l') {
                        JSKW_GOT_MATCH(38) /* float */
                    }
                    JSKW_NO_MATCH()
                }
                JSKW_NO_MATCH()
            }
            JSKW_NO_MATCH()
          case 'c':
            if (JSKW_AT(0)=='c' && JSKW_AT(1)=='a' && JSKW_AT(2)=='t' && JSKW_AT(4)=='h') {
                JSKW_GOT_MATCH(26) /* catch */
            }
            JSKW_NO_MATCH()
          case 'e':
            if (JSKW_AT(0)=='s' && JSKW_AT(1)=='u' && JSKW_AT(2)=='p' && JSKW_AT(4)=='r') {
                JSKW_GOT_MATCH(52) /* super */
            }
            JSKW_NO_MATCH()
          case 'l':
            if (JSKW_AT(0) == 'w') {
                if (JSKW_AT(4)=='e' && JSKW_AT(1)=='h' && JSKW_AT(2)=='i') {
                    JSKW_GOT_MATCH(22) /* while */
                }
                JSKW_NO_MATCH()
            }
            if (JSKW_AT(0) == 'y') {
                if (JSKW_AT(4)=='d' && JSKW_AT(1)=='i' && JSKW_AT(2)=='e') {
                    JSKW_GOT_MATCH(59) /* yield */
                }
                JSKW_NO_MATCH()
            }
            JSKW_NO_MATCH()
          case 'o':
            if (JSKW_AT(0)=='t' && JSKW_AT(1)=='h' && JSKW_AT(2)=='r' && JSKW_AT(4)=='w') {
                JSKW_GOT_MATCH(28) /* throw */
            }
            JSKW_NO_MATCH()
          case 'r':
            if (JSKW_AT(0)=='s' && JSKW_AT(1)=='h' && JSKW_AT(2)=='o' && JSKW_AT(4)=='t') {
                JSKW_GOT_MATCH(50) /* short */
            }
            JSKW_NO_MATCH()
          case 's':
            if (JSKW_AT(0) == 'c') {
                if (JSKW_AT(4) == 's') {
                    if (JSKW_AT(2)=='a' && JSKW_AT(1)=='l') {
                        JSKW_GOT_MATCH(34) /* class */
                    }
                    JSKW_NO_MATCH()
                }
                if (JSKW_AT(4) == 't') {
                    if (JSKW_AT(2)=='n' && JSKW_AT(1)=='o') {
                        JSKW_GOT_MATCH(24) /* const */
                    }
                    JSKW_NO_MATCH()
                }
                JSKW_NO_MATCH()
            }
            if (JSKW_AT(0) == 'f') {
                if (JSKW_AT(4)=='e' && JSKW_AT(1)=='a' && JSKW_AT(2)=='l') {
                    JSKW_GOT_MATCH(8) /* false */
                }
                JSKW_NO_MATCH()
            }
            JSKW_NO_MATCH()
        }
        JSKW_NO_MATCH()
      case 6:
        switch (JSKW_AT(0)) {
          case 'd':
            if (JSKW_AT(1) == 'o') {
                if (JSKW_AT(5)=='e' && JSKW_AT(4)=='l' && JSKW_AT(2)=='u' && JSKW_AT(3)=='b') {
                    JSKW_GOT_MATCH(35) /* double */
                }
                JSKW_NO_MATCH()
            }
            if (JSKW_AT(1) == 'e') {
                if (JSKW_AT(5)=='e' && JSKW_AT(4)=='t' && JSKW_AT(2)=='l' && JSKW_AT(3)=='e') {
                    JSKW_GOT_MATCH(4) /* delete */
                }
                JSKW_NO_MATCH()
            }
            JSKW_NO_MATCH()
          case 'e':
            JSKW_TEST_GUESS(7) /* export */
          case 'i':
            JSKW_TEST_GUESS(41) /* import */
          case 'n':
            JSKW_TEST_GUESS(45) /* native */
          case 'p':
            JSKW_TEST_GUESS(49) /* public */
          case 'r':
            JSKW_TEST_GUESS(15) /* return */
          case 's':
            if (JSKW_AT(1) == 't') {
                if (JSKW_AT(5)=='c' && JSKW_AT(4)=='i' && JSKW_AT(2)=='a' && JSKW_AT(3)=='t') {
                    JSKW_GOT_MATCH(51) /* static */
                }
                JSKW_NO_MATCH()
            }
            if (JSKW_AT(1) == 'w') {
                if (JSKW_AT(5)=='h' && JSKW_AT(4)=='c' && JSKW_AT(2)=='i' && JSKW_AT(3)=='t') {
                    JSKW_GOT_MATCH(16) /* switch */
                }
                JSKW_NO_MATCH()
            }
            JSKW_NO_MATCH()
          case 't':
            if (JSKW_AT(5) == 'f') {
                if (JSKW_AT(4)=='o' && JSKW_AT(1)=='y' && JSKW_AT(2)=='p' && JSKW_AT(3)=='e') {
                    JSKW_GOT_MATCH(19) /* typeof */
                }
                JSKW_NO_MATCH()
            }
            if (JSKW_AT(5) == 's') {
                if (JSKW_AT(4)=='w' && JSKW_AT(1)=='h' && JSKW_AT(2)=='r' && JSKW_AT(3)=='o') {
                    JSKW_GOT_MATCH(54) /* throws */
                }
                JSKW_NO_MATCH()
            }
            JSKW_NO_MATCH()
        }
        JSKW_NO_MATCH()
      case 7:
        switch (JSKW_AT(0)) {
          case 'b':
            JSKW_TEST_GUESS(31) /* boolean */
          case 'd':
            JSKW_TEST_GUESS(3) /* default */
          case 'e':
            JSKW_TEST_GUESS(36) /* extends */
          case 'f':
            JSKW_TEST_GUESS(27) /* finally */
          case 'p':
            if (JSKW_AT(1) == 'a') {
                JSKW_TEST_GUESS(46) /* package */
            }
            if (JSKW_AT(1) == 'r') {
                JSKW_TEST_GUESS(47) /* private */
            }
            JSKW_NO_MATCH()
        }
        JSKW_NO_MATCH()
      case 8:
        switch (JSKW_AT(4)) {
          case 'g':
            JSKW_TEST_GUESS(58) /* debugger */
          case 'i':
            JSKW_TEST_GUESS(2) /* continue */
          case 'r':
            JSKW_TEST_GUESS(30) /* abstract */
          case 't':
            if (JSKW_AT(1) == 'o') {
                JSKW_TEST_GUESS(56) /* volatile */
            }
            if (JSKW_AT(1) == 'u') {
                JSKW_TEST_GUESS(10) /* function */
            }
            JSKW_NO_MATCH()
        }
        JSKW_NO_MATCH()
      case 9:
        if (JSKW_AT(1) == 'n') {
            JSKW_TEST_GUESS(43) /* interface */
        }
        if (JSKW_AT(1) == 'r') {
            if (JSKW_AT(0) == 'p') {
                JSKW_TEST_GUESS(48) /* protected */
            }
            if (JSKW_AT(0) == 't') {
                JSKW_TEST_GUESS(55) /* transient */
            }
            JSKW_NO_MATCH()
        }
        JSKW_NO_MATCH()
      case 10:
        if (JSKW_AT(1) == 'n') {
            JSKW_TEST_GUESS(29) /* instanceof */
        }
        if (JSKW_AT(1) == 'm') {
            JSKW_TEST_GUESS(40) /* implements */
        }
        JSKW_NO_MATCH()
      case 12:
        JSKW_TEST_GUESS(53) /* synchronized */
    }
    JSKW_NO_MATCH()
