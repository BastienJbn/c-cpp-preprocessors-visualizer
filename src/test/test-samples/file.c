#define A 1
#define B 1  // No undef, should not be outlined

// Off screen test
#ifdef A

int main() {
    int a,b;

// Depth test
#if defined C
    int a = 1;

// Middle keywords test
#ifdef NOT
    // Should not be defined
    int a = 1;
#elif defined B

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
#undef NOT //No pair test



































#endif
