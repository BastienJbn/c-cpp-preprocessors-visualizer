#define A 1
#define B 1

// Off screen test
#ifdef A

int main() {
    int a,b;

// Depth test
#if defined A
    int a = 1;

// Middle keywords test
#ifdef A
    int a = 1;
#elif defined NOT

#ifdef C
    int c = 1;
#else
    int c = 2;
#endif

    int b = 2;
#else
    int b = 3;
#endif
    int a = 1;

#endif

// Indentation test
    #ifdef A
    int a = 1;
        #ifdef B
        int b = 2;
        #else
        int b = 3;
        #endif
    #endif

  return 0;
}

// Definition test
#undef A

#undef //Bad line test
#undef NOT //No pair test, should not be outlined




































#endif
